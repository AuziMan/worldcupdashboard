from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import hashlib
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
REDIS_URL = os.getenv("UPSTASH_REDIS_REST_URL", "")
REDIS_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
BASE_URL = "https://api.football-data.org/v4"
COMPETITION = "WC"
CACHE_TTL_DEFAULT = timedelta(seconds=60)
CACHE_TTL_LIVE = timedelta(seconds=60)

_cache: dict = {}

try:
    from upstash_redis import Redis
    _redis = Redis(url=REDIS_URL, token=REDIS_TOKEN) if REDIS_URL and REDIS_TOKEN else None
except Exception:
    _redis = None


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
    if not _redis:
        return jsonify({"ok": True})
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        ip = get_remote_address() or "unknown"
        visitor_hash = hashlib.sha256(f"{ip}:{today}".encode()).hexdigest()[:16]
        ttl = 90 * 24 * 3600  # 90 days

        pipe = _redis.pipeline()
        pipe.incr("wcd:total_visits")
        pipe.incr(f"wcd:daily:{today}:visits")
        pipe.sadd(f"wcd:daily:{today}:unique", visitor_hash)
        pipe.expire(f"wcd:daily:{today}:visits", ttl)
        pipe.expire(f"wcd:daily:{today}:unique", ttl)
        pipe.exec()
    except Exception:
        pass
    return jsonify({"ok": True})


@app.route("/api/analytics")
def analytics():
    token = request.headers.get("X-Refresh-Token", "")
    if not REFRESH_SECRET or token != REFRESH_SECRET:
        return jsonify({"error": "Unauthorized"}), 401
    if not _redis:
        return jsonify({"error": "Analytics not configured"}), 503

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    date_keys = [
        (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        for i in range(6, -1, -1)
    ]

    pipe = _redis.pipeline()
    for d in date_keys:
        pipe.get(f"wcd:daily:{d}:visits")
        pipe.scard(f"wcd:daily:{d}:unique")
    pipe.get("wcd:total_visits")
    results = pipe.exec()

    days = []
    for i, d in enumerate(date_keys):
        days.append({
            "date": d,
            "visits": int(results[i * 2] or 0),
            "unique_visitors": int(results[i * 2 + 1] or 0),
        })

    today_data = next((x for x in days if x["date"] == today), {"visits": 0, "unique_visitors": 0})
    return jsonify({
        "total_visits": int(results[-1] or 0),
        "today_visits": today_data["visits"],
        "today_unique_visitors": today_data["unique_visitors"],
        "last_7_days": days,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5001)
