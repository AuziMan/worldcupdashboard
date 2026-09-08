"""In-memory response cache shared by every league/sport. Keyed per
league+resource (e.g. "matches_mls"), TTL depends on whether the cached
matches payload has anything currently live.

Bounded to MAX_ENTRIES (evicting the least-recently-used key) rather than
growing forever: most keys are drawn from a small fixed set (matches_<league>,
standings_<league>, teams_<league> for ~7 leagues), but team_<league>_<id>
keys are seeded from a client-supplied path segment
(routes/leagues.py's /api/<league>/teams/<team_id>) with no fixed universe —
without a cap, hammering that endpoint with unique junk IDs would grow this
dict without bound until the process runs out of memory.
"""

from collections import OrderedDict
from datetime import datetime, timezone

from config import CACHE_TTL_DEFAULT, CACHE_TTL_LIVE

MAX_ENTRIES = 500

# OrderedDict so eviction can be true LRU: cached() moves a key to the end on
# every read *and* write, so popitem(last=False) always drops the entry that
# has gone longest untouched, not just the oldest-inserted one.
_cache: OrderedDict = OrderedDict()


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
        _cache.move_to_end(key)
        return entry["data"]
    data = fetch()
    _cache[key] = {"data": data, "ts": now}
    _cache.move_to_end(key)
    while len(_cache) > MAX_ENTRIES:
        _cache.popitem(last=False)
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
