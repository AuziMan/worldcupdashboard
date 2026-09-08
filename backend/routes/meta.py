"""Cache introspection/control, shared across every league: /api/status,
/api/refresh.
"""

import hmac

from flask import Blueprint, jsonify, request

import cache
from config import API_KEY, REFRESH_SECRET
from extensions import limiter

bp = Blueprint("meta", __name__)


@bp.route("/api/status")
def status():
    return jsonify({"cache": cache.snapshot(), "api_key_configured": bool(API_KEY)})


@bp.route("/api/refresh", methods=["POST"])
@limiter.limit("5 per minute")
def refresh():
    token = request.headers.get("X-Refresh-Token", "")
    # hmac.compare_digest, not `!=` — a plain string comparison short-circuits
    # on the first mismatched byte, which leaks how many leading characters
    # of the token were correct via response timing.
    if not REFRESH_SECRET or not hmac.compare_digest(token, REFRESH_SECRET):
        return jsonify({"error": "Unauthorized"}), 401
    cache.clear()
    return jsonify({"message": "Cache cleared. Next request will fetch fresh data."})
