"""League-scoped data routes, shared by every sport: /api/<league>/matches,
/standings, /teams, /teams/<team_id>. Unknown league key -> 404. Dispatch to
the right provider happens in sports/registry.py.
"""

from flask import Blueprint, jsonify, request

from cache import cached
from scopes import VALID_RANGES
from sports import registry

bp = Blueprint("leagues", __name__)

# `range` lets a caller ask for a slice of the full window instead of
# everything at once, so dashboards (hooks/useLeagueData.js etc.) and the
# homepage (hooks/useLiveFeed.js) can paint today's games first, then the
# next two days, then the rest. See scopes.py for what each slice covers;
# the unscoped default is still the whole window.


@bp.route("/api/<league>/matches")
def matches(league):
    if not registry.known_league(league):
        return jsonify({"error": "Unknown league"}), 404
    scope = request.args.get("range", "all")
    if scope != "all" and scope not in VALID_RANGES:
        return jsonify({"error": "Invalid range"}), 400
    cache_key = f"matches_{league}" if scope == "all" else f"matches_{league}_{scope}"
    data = cached(cache_key, lambda: registry.fetch_matches(league, scope))
    return jsonify(data)


@bp.route("/api/<league>/standings")
def standings(league):
    if not registry.known_league(league):
        return jsonify({"error": "Unknown league"}), 404
    data = cached(f"standings_{league}", lambda: registry.fetch_standings(league))
    return jsonify(data)


@bp.route("/api/<league>/teams")
def teams(league):
    if not registry.known_league(league):
        return jsonify({"error": "Unknown league"}), 404
    data = cached(f"teams_{league}", lambda: registry.fetch_teams(league))
    return jsonify(data)


@bp.route("/api/<league>/teams/<team_id>")
def team_detail(league, team_id):
    if not registry.known_league(league):
        return jsonify({"error": "Unknown league"}), 404
    # Every provider's team id is numeric (football-data.org, ESPN, MLB Stats
    # API alike) — reject anything else before it reaches cache.cached() or a
    # provider's URL-building. This closes two things at once: an attacker
    # feeding arbitrary strings here can no longer grow the cache with
    # unbounded distinct keys, and stray characters (e.g. "?", "#") can no
    # longer ride along into the upstream request URL.
    if not team_id.isdigit():
        return jsonify({"error": "Invalid team id"}), 404
    data = cached(f"team_{league}_{team_id}", lambda: registry.fetch_team_detail(league, team_id))
    return jsonify(data)
