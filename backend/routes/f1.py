"""F1-only route: per-session detail (driver roster + live/final results),
for the session detail modal. Doesn't fit routes/leagues.py's generic
<league> resource shape (matches/standings/teams) since no other sport has
a "session" concept — a race weekend is many of these, not one match.

Deliberately NOT run through cache.py's shared cached() helper, unlike every
other route in this app: OpenF1's position data updates every few seconds
during a live session (see providers/openf1.py's docstring), and the whole
point of using it is near-real-time positions — sitting behind cache.py's
60s TTL would just re-serve a stale snapshot to a modal polling more often
than that. This is a single on-demand call for whichever one session a user
has open, not a background poll, so skipping the shared cache here doesn't
add meaningful load.
"""

from flask import Blueprint, jsonify

from providers import openf1 as openf1_provider

bp = Blueprint("f1", __name__)


@bp.route("/api/f1/sessions/<session_id>")
def session_detail(session_id):
    return jsonify(openf1_provider.session_detail(session_id))
