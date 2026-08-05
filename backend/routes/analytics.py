"""Visit analytics, backed by Upstash Redis: /api/analytics/visit (POST,
increments visit counter), /api/analytics (GET, returns visit stats for the
admin panel).
"""

import hashlib
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_limiter.util import get_remote_address

from config import REFRESH_SECRET
from extensions import limiter, redis_client

bp = Blueprint("analytics", __name__)


@bp.route("/api/analytics/visit", methods=["POST"])
@limiter.limit("10 per minute")
def analytics_visit():
    if not redis_client:
        return jsonify({"ok": True})
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        ip = get_remote_address() or "unknown"
        visitor_hash = hashlib.sha256(f"{ip}:{today}".encode()).hexdigest()[:16]
        ttl = 90 * 24 * 3600  # 90 days

        pipe = redis_client.pipeline()
        pipe.incr("wcd:total_visits")
        pipe.incr(f"wcd:daily:{today}:visits")
        pipe.sadd(f"wcd:daily:{today}:unique", visitor_hash)
        pipe.expire(f"wcd:daily:{today}:visits", ttl)
        pipe.expire(f"wcd:daily:{today}:unique", ttl)
        pipe.exec()
    except Exception:
        pass
    return jsonify({"ok": True})


@bp.route("/api/analytics")
def analytics():
    token = request.headers.get("X-Refresh-Token", "")
    if not REFRESH_SECRET or token != REFRESH_SECRET:
        return jsonify({"error": "Unauthorized"}), 401
    if not redis_client:
        return jsonify({"error": "Analytics not configured"}), 503

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    date_keys = [
        (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        for i in range(6, -1, -1)
    ]

    pipe = redis_client.pipeline()
    for d in date_keys:
        pipe.get(f"wcd:daily:{d}:visits")
        pipe.scard(f"wcd:daily:{d}:unique")
    pipe.get("wcd:total_visits")
    results = pipe.exec()

    days = []
    for i, d in enumerate(date_keys):
        days.append({
            "date": d,
            "visits": int(results[i * 2] or 0),
            "unique_visitors": int(results[i * 2 + 1] or 0),
        })

    today_data = next((x for x in days if x["date"] == today), {"visits": 0, "unique_visitors": 0})
    return jsonify({
        "total_visits": int(results[-1] or 0),
        "today_visits": today_data["visits"],
        "today_unique_visitors": today_data["unique_visitors"],
        "last_7_days": days,
    })
