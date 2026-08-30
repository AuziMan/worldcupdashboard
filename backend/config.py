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
