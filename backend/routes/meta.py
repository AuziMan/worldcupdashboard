"""Cache introspection/control, shared across every league: /api/status,
/api/refresh.
"""

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
    if not REFRESH_SECRET or token != REFRESH_SECRET:
        return jsonify({"error": "Unauthorized"}), 401
    cache.clear()
    return jsonify({"message": "Cache cleared. Next request will fetch fresh data."})
