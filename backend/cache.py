"""In-memory response cache shared by every league/sport. Keyed per
league+resource (e.g. "matches_mls"), TTL depends on whether the cached
matches payload has anything currently live.
"""

from datetime import datetime, timezone

from config import CACHE_TTL_DEFAULT, CACHE_TTL_LIVE

_cache: dict = {}


def _has_live_matches(data: dict) -> bool:
    return any(
        m.get("status") in ("IN_PLAY", "PAUSED")
        for m in data.get("matches", [])
    )


def cached(key: str, fetch):
    now = datetime.now(timezone.utc)
    entry = _cache.get(key)
    live = key.startswith("matches_") and entry and _has_live_matches(entry["data"])
    ttl = CACHE_TTL_LIVE if live else CACHE_TTL_DEFAULT
    if entry and now - entry["ts"] < ttl:
        return entry["data"]
    data = fetch()
    _cache[key] = {"data": data, "ts": now}
    return data


def clear():
    _cache.clear()


def snapshot() -> dict:
    """Per-key cache state for /api/status."""
    now = datetime.now(timezone.utc)
    info = {}
    for key, entry in _cache.items():
        live = key.startswith("matches_") and _has_live_matches(entry["data"])
        ttl = CACHE_TTL_LIVE if live else CACHE_TTL_DEFAULT
        last = entry["ts"]
        next_refresh = last + ttl
        info[key] = {
            "last_updated": last.isoformat(),
            "next_update": next_refresh.isoformat(),
            "stale": now > next_refresh,
            "live_mode": live,
        }
    return info
