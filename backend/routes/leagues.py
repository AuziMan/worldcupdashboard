"""League-scoped data routes, shared by every sport: /api/<league>/matches,
/standings, /teams, /teams/<team_id>. Unknown league key -> 404. Dispatch to
the right provider happens in sports/registry.py.
"""

from flask import Blueprint, jsonify

from cache import cached
from sports import registry

bp = Blueprint("leagues", __name__)


@bp.route("/api/<league>/matches")
def matches(league):
    if not registry.known_league(league):
        return jsonify({"error": "Unknown league"}), 404
    data = cached(f"matches_{league}", lambda: registry.fetch_matches(league))
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
    data = cached(f"team_{league}_{team_id}", lambda: registry.fetch_team_detail(league, team_id))
    return jsonify(data)
