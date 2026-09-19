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

import threading
from collections import OrderedDict
from datetime import datetime, timezone

from config import CACHE_TTL_DEFAULT, CACHE_TTL_LIVE

MAX_ENTRIES = 500

# OrderedDict so eviction can be true LRU: cached() moves a key to the end on
# every read *and* write, so popitem(last=False) always drops the entry that
# has gone longest untouched, not just the oldest-inserted one.
_cache: OrderedDict = OrderedDict()

# Striped locks (fixed count, not one per key) so concurrent requests for the
# same cold key serialize onto one fetch instead of each independently
# calling fetch() — this matters a lot now that gunicorn runs multiple
# request-handling threads (see render.yaml): without this, several requests
# landing within the same cache-miss window for e.g. matches_ncaaf each fired
# off their own 91-request ESPN burst (see providers/espn.py's matches()),
# which was enough concurrent thread/network load on Render's free tier to
# starve even unrelated, otherwise-fast endpoints. A fixed stripe count keeps
# this bounded (unlike a dict keyed per-cache-key, which would grow exactly
# like the MAX_ENTRIES problem above); two unrelated keys occasionally
# sharing a stripe just means one waits a beat, not a correctness issue.
_LOCK_STRIPES = 32
_locks = [threading.Lock() for _ in range(_LOCK_STRIPES)]


def _lock_for(key: str) -> threading.Lock:
    return _locks[hash(key) % _LOCK_STRIPES]


def _has_live_matches(data: dict) -> bool:
    return any(
        m.get("status") in ("IN_PLAY", "PAUSED")
        for m in data.get("matches", [])
    )


def _fresh(key: str):
    """Returns the cached entry's data if it's still within TTL, else None."""
    now = datetime.now(timezone.utc)
    entry = _cache.get(key)
    live = key.startswith("matches_") and entry and _has_live_matches(entry["data"])
    ttl = CACHE_TTL_LIVE if live else CACHE_TTL_DEFAULT
    if entry and now - entry["ts"] < ttl:
        _cache.move_to_end(key)
        return entry["data"]
    return None


def cached(key: str, fetch):
    data = _fresh(key)
    if data is not None:
        return data

    with _lock_for(key):
        # Re-check after acquiring the lock — another thread may have already
        # refreshed this key while this one was waiting on it.
        data = _fresh(key)
        if data is not None:
            return data
        data = fetch()
        _cache[key] = {"data": data, "ts": datetime.now(timezone.utc)}
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
