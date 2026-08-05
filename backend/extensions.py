"""Flask extension instances: CORS, rate limiting, and the optional Redis client
used for analytics. Kept separate from app.py so routes/*.py can import
`limiter` for the `@limiter.limit(...)` decorator without importing the app
factory itself (which would be a circular import).
"""

from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import REDIS_TOKEN, REDIS_URL

limiter = Limiter(
    get_remote_address,
    default_limits=["60 per minute"],
    storage_uri="memory://",
)


def init_cors(app, origins):
    CORS(app, origins=origins)


try:
    from upstash_redis import Redis
    redis_client = Redis(url=REDIS_URL, token=REDIS_TOKEN) if REDIS_URL and REDIS_TOKEN else None
except Exception:
    redis_client = None
