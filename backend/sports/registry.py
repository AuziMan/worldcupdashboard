"""Every league the frontend can request, and which sport module serves it.
This is the single place that ties a URL's <league> segment (routes/leagues.py)
to the sport-specific module that knows how to fetch it — each sport module
owns its own LEAGUES sub-dict; this just merges them for lookup.
"""

from sports import mlb, nba, soccer, ufc

_MODULES = [soccer, nba, mlb, ufc]

LEAGUE_MODULE = {
    league: module
    for module in _MODULES
    for league in module.LEAGUES
}


def known_league(league: str) -> bool:
    return league in LEAGUE_MODULE


def fetch_matches(league: str) -> dict:
    return LEAGUE_MODULE[league].fetch_matches(league)


def fetch_standings(league: str) -> dict:
    return LEAGUE_MODULE[league].fetch_standings(league)


def fetch_teams(league: str) -> dict:
    return LEAGUE_MODULE[league].fetch_teams(league)


def fetch_team_detail(league: str, team_id) -> dict:
    return LEAGUE_MODULE[league].fetch_team_detail(league, team_id)
