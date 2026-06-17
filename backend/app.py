from flask import Flask, jsonify
from flask_cors import CORS
import requests
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
BASE_URL = "https://api.football-data.org/v4"
COMPETITION = "WC"
CACHE_TTL_DEFAULT = timedelta(seconds=60)
CACHE_TTL_LIVE = timedelta(seconds=60)

_cache: dict = {}


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
def refresh():
    _cache.clear()
    return jsonify({"message": "Cache cleared. Next request will fetch fresh data."})


if __name__ == "__main__":
    app.run(debug=True, port=5001)
