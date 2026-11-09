"""Environment loading and app-wide constants shared across providers/routes."""

import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

ALLOWED_ORIGINS = [
    "https://gamefold.net",
    "https://www.gamefold.net",
    "https://auziman.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
REFRESH_SECRET = os.getenv("REFRESH_SECRET", "")
REDIS_URL = os.getenv("UPSTASH_REDIS_REST_URL", "")
REDIS_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4"

# 60 seconds whether or not a match is live. Kept as two separate constants
# (rather than one) so the two cases can be tuned independently later.
CACHE_TTL_DEFAULT = timedelta(seconds=60)
CACHE_TTL_LIVE = timedelta(seconds=60)

# Slower-moving slices of a league's match window (see scopes.py) refresh far
# less often than today/soon: finished games essentially never change, and a
# schedule days out rarely does. Refreshing them every minute was most of the
# upstream load on Render's free tier (UFC's "later" alone is 178 requests).
CACHE_TTL_LATER = timedelta(minutes=10)
CACHE_TTL_PAST = timedelta(minutes=60)
# A response with a failed upstream day in it (see "partial" in
# providers/espn.py) is only trusted this long, whatever slice it is.
CACHE_TTL_PARTIAL = timedelta(seconds=15)

# Hard ceiling on how old a *matches* entry may be and still be served
# (stale-while-revalidate, see cache.py). Past this, the request waits for a
# fresh fetch instead — otherwise an idle backend serves hours-old data
# (e.g. last night's IN_PLAY game) as if current. The live ceiling is tighter
# because a stale "live" snapshot is the most misleading kind of stale.
CACHE_MAX_STALE = timedelta(minutes=10)
CACHE_MAX_STALE_LIVE = timedelta(minutes=2)
