"""App factory + entrypoint. Everything else lives in config.py, extensions.py,
cache.py, providers/, sports/, and routes/ — see CLAUDE.md for the full map.
Kept as a real module-level `app` object at backend/ root because
render.yaml's start command is `gunicorn app:app` with rootDir: backend.
"""

import concurrent.futures
import threading

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from cache import cached
from config import ALLOWED_ORIGINS
from extensions import init_cors, limiter
from routes import analytics, f1, leagues, meta
from sports import registry

# Mirrors frontend/src/hooks/useLiveFeed.js's LEAGUES list (kept in sync by
# hand — they're different languages/processes, nothing derives one from the
# other): the leagues the homepage's live rail actually requests via
# ?range=today/future. "wc" is excluded there too (dormant until WC 2030
# fixtures exist), so warming it here would just be wasted work nothing
# reads before its own TTL expires it.
LIVE_RAIL_LEAGUES = ["epl", "mls", "mlb", "nba", "nfl", "ncaaf", "ufc", "f1"]


def _warm_live_rail_cache():
    # Render's free tier is slow enough per outbound request (seen in
    # production: a single upstream call can take 10-15+ seconds even for
    # the cheap "today" scope — see routes/leagues.py) that the *first*
    # request for each cache key, right after every deploy or free-tier
    # spin-down, was landing on a real visitor instead of happening quietly
    # in the background. This fires all 16 (league, scope) combinations the
    # homepage's first load needs through cache.cached() — same cache, same
    # keys a real request would use — on a bounded thread pool (not 16 at
    # once: these compete with gunicorn's own request-handling threads for
    # the same limited CPU, see render.yaml) so by the time real traffic
    # arrives, most of it is already warm. Best-effort: an upstream outage
    # here just means the first real request falls back to today's cold-path
    # behavior, same as before this existed.
    def _warm_one(league, scope):
        try:
            cached(f"matches_{league}_{scope}", lambda: registry.fetch_matches(league, scope))
        except Exception:
            pass

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for league in LIVE_RAIL_LEAGUES:
            for scope in ("today", "future"):
                pool.submit(_warm_one, league, scope)


def create_app():
    app = Flask(__name__)
    # Render terminates TLS and proxies to this app over one internal hop, so
    # request.remote_addr would otherwise be Render's proxy, not the visitor —
    # collapsing per-IP rate limiting (extensions.py's limiter) and the
    # per-visitor hashing in routes/analytics.py down to a single shared
    # identity for all traffic. x_for=1 trusts exactly one hop of
    # X-Forwarded-For, matching that one proxy; raise it only if another
    # trusted proxy layer is added in front of Render.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
    init_cors(app, ALLOWED_ORIGINS)
    limiter.init_app(app)

    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Cache-Control"] = "no-store"
        return response

    app.register_blueprint(leagues.bp)
    app.register_blueprint(meta.bp)
    app.register_blueprint(analytics.bp)
    app.register_blueprint(f1.bp)

    # Fire-and-forget: must not block gunicorn's own startup/health check, so
    # this runs on a daemon thread rather than inline here.
    threading.Thread(target=_warm_live_rail_cache, daemon=True).start()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5001)
