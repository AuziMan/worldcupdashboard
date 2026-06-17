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
CACHE_TTL = timedelta(minutes=5)

_cache: dict = {}


def _headers():
    return {"X-Auth-Token": API_KEY}


def _get(path: str) -> dict:
    r = requests.get(f"{BASE_URL}{path}", headers=_headers(), timeout=10)
    r.raise_for_status()
    return r.json()


def cached(key: str, fetch):
    now = datetime.now(timezone.utc)
    entry = _cache.get(key)
    if entry and now - entry["ts"] < CACHE_TTL:
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
        last = entry["ts"]
        next_refresh = last + CACHE_TTL
        info[key] = {
            "last_updated": last.isoformat(),
            "next_update": next_refresh.isoformat(),
            "stale": now > next_refresh,
        }
    return jsonify({"cache": info, "api_key_configured": bool(API_KEY)})


@app.route("/api/refresh", methods=["POST"])
def refresh():
    _cache.clear()
    return jsonify({"message": "Cache cleared. Next request will fetch fresh data."})


if __name__ == "__main__":
    app.run(debug=True, port=5001)
