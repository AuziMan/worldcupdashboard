"""App factory + entrypoint. Everything else lives in config.py, extensions.py,
cache.py, providers/, sports/, and routes/ — see CLAUDE.md for the full map.
Kept as a real module-level `app` object at backend/ root because
render.yaml's start command is `gunicorn app:app` with rootDir: backend.
"""

from flask import Flask

from config import ALLOWED_ORIGINS
from extensions import init_cors, limiter
from routes import analytics, f1, leagues, meta


def create_app():
    app = Flask(__name__)
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

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5001)
