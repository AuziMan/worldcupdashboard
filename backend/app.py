from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import hashlib
import json
import requests
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

ALLOWED_ORIGINS = [
    "https://auziman.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS(app, origins=ALLOWED_ORIGINS)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute"],
    storage_uri="memory://",
)

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
REFRESH_SECRET = os.getenv("REFRESH_SECRET", "")
BASE_URL = "https://api.football-data.org/v4"
COMPETITION = "WC"
CACHE_TTL_DEFAULT = timedelta(seconds=60)
CACHE_TTL_LIVE = timedelta(seconds=60)

_cache: dict = {}

ANALYTICS_FILE = os.path.join(os.path.dirname(__file__), "analytics.json")


def _load_analytics() -> dict:
    try:
        with open(ANALYTICS_FILE) as f:
            data = json.load(f)
            data.setdefault("total_visits", 0)
            data.setdefault("daily", {})
            return data
    except (FileNotFoundError, json.JSONDecodeError):
        return {"total_visits": 0, "daily": {}}


def _save_analytics(data: dict):
    try:
        with open(ANALYTICS_FILE, "w") as f:
            json.dump(data, f)
    except OSError:
        pass  # Ephemeral filesystem on Render — counts survive within a dyno session


_analytics = _load_analytics()


def _headers():
    return {"X-Auth-Token": API_KEY}


def _get(path: str) -> dict:
    r = requests.get(f"{BASE_URL}{path}", headers=_headers(), timeout=10)
    r.raise_for_status()
    return r.json()


def _has_live_matches(data: dict) -> bool:
    return any(
        m.get("status") in ("IN_PLAY", "PAUSED")
        for m in data.get("matches", [])
    )


def cached(key: str, fetch):
    now = datetime.now(timezone.utc)
    entry = _cache.get(key)
    live = key == "matches" and entry and _has_live_matches(entry["data"])
    ttl = CACHE_TTL_LIVE if live else CACHE_TTL_DEFAULT
    if entry and now - entry["ts"] < ttl:
        return entry["data"]
    data = fetch()
    _cache[key] = {"data": data, "ts": now}
    return data


@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/api/matches")
def matches():
    data = cached("matches", lambda: _get(f"/competitions/{COMPETITION}/matches"))
    return jsonify(data)


@app.route("/api/standings")
def standings():
    data = cached("standings", lambda: _get(f"/competitions/{COMPETITION}/standings"))
    return jsonify(data)


@app.route("/api/teams")
def teams():
    data = cached("teams", lambda: _get(f"/competitions/{COMPETITION}/teams"))
    return jsonify(data)


@app.route("/api/teams/<int:team_id>")
def team_detail(team_id):
    data = cached(f"team_{team_id}", lambda: _get(f"/teams/{team_id}"))
    return jsonify(data)


@app.route("/api/status")
def status():
    now = datetime.now(timezone.utc)
    info = {}
    for key, entry in _cache.items():
        live = key == "matches" and _has_live_matches(entry["data"])
        ttl = CACHE_TTL_LIVE if live else CACHE_TTL_DEFAULT
        last = entry["ts"]
        next_refresh = last + ttl
        info[key] = {
            "last_updated": last.isoformat(),
            "next_update": next_refresh.isoformat(),
            "stale": now > next_refresh,
            "live_mode": live,
        }
    return jsonify({"cache": info, "api_key_configured": bool(API_KEY)})


@app.route("/api/refresh", methods=["POST"])
@limiter.limit("5 per minute")
def refresh():
    token = request.headers.get("X-Refresh-Token", "")
    if not REFRESH_SECRET or token != REFRESH_SECRET:
        return jsonify({"error": "Unauthorized"}), 401
    _cache.clear()
    return jsonify({"message": "Cache cleared. Next request will fetch fresh data."})


@app.route("/api/analytics/visit", methods=["POST"])
@limiter.limit("10 per minute")
def analytics_visit():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ip = get_remote_address() or "unknown"
    visitor_hash = hashlib.sha256(f"{ip}:{today}".encode()).hexdigest()[:16]

    daily = _analytics.setdefault("daily", {})
    day = daily.setdefault(today, {"visits": 0, "unique": []})

    day["visits"] += 1
    _analytics["total_visits"] = _analytics.get("total_visits", 0) + 1

    if visitor_hash not in day["unique"]:
        day["unique"].append(visitor_hash)

    _save_analytics(_analytics)
    return jsonify({"ok": True})


@app.route("/api/analytics")
def analytics():
    token = request.headers.get("X-Refresh-Token", "")
    if not REFRESH_SECRET or token != REFRESH_SECRET:
        return jsonify({"error": "Unauthorized"}), 401

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    daily = _analytics.get("daily", {})

    days = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        d_data = daily.get(d, {"visits": 0, "unique": []})
        days.append({
            "date": d,
            "visits": d_data["visits"],
            "unique_visitors": len(d_data["unique"]),
        })

    today_data = daily.get(today, {"visits": 0, "unique": []})
    return jsonify({
        "total_visits": _analytics.get("total_visits", 0),
        "today_visits": today_data["visits"],
        "today_unique_visitors": len(today_data["unique"]),
        "last_7_days": days,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5001)
