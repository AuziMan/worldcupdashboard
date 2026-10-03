"""App factory + entrypoint. Everything else lives in config.py, extensions.py,
cache.py, providers/, sports/, and routes/ — see CLAUDE.md for the full map.
Kept as a real module-level `app` object at backend/ root because
render.yaml's start command is `gunicorn app:app` with rootDir: backend.
"""

import threading

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

import cache
from config import ALLOWED_ORIGINS
from extensions import init_cors, limiter
from routes import analytics, f1, leagues, meta
from sports import registry

# Leagues whose matches() is slow enough (ESPN's per-day scoreboard workaround
# — see providers/espn.py) that the *first* request to hit a cold cache key
# for one, after any process restart, would otherwise block for ~30s. Warmed
# first and in this order so the slow ones are covered as early as possible;
# the rest of the registry (fast providers) gets warmed right after.
_WARM_FIRST = ["mls", "nba", "nfl", "ncaaf"]


def _warm_cache():
    leagues_in_order = _WARM_FIRST + [
        league for league in registry.LEAGUE_MODULE if league not in _WARM_FIRST
    ]
    for league in leagues_in_order:
        # matches/standings only, not teams: rosters aren't what users are
        # waiting on (see cache.py's stale-while-revalidate for the eventual
        # first real request to teams_<league>), and skipping them here
        # roughly halves the request burst this fires at boot — worth it
        # given football-data.org's (wc/epl) free tier caps at 10 req/min,
        # a budget real user traffic also has to share.
        for resource, fetch in (
            ("matches", registry.fetch_matches),
            ("standings", registry.fetch_standings),
        ):
            try:
                cache.cached(f"{resource}_{league}", lambda l=league, f=fetch: f(l))
            except Exception:
                # A slow/broken upstream during warmup shouldn't stop the rest
                # of the leagues from warming — cache.cached()'s normal
                # per-request path will just retry this one on first use.
                pass


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

    # Fire-and-forget: populates cache.py's cache for every known league
    # before any real request arrives, so the *first* user to hit a cold key
    # after a restart doesn't have to be the one who waits ~30s for it (see
    # cache.py's stale-while-revalidate path, which otherwise only helps once
    # something has been cached at least once). Runs in the background so
    # create_app() — and therefore gunicorn's boot/health check — isn't
    # blocked on it.
    threading.Thread(target=_warm_cache, daemon=True).start()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5001)
