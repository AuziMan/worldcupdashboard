"""MLB is served by MLB's own undocumented statsapi.mlb.com endpoints (no key
needed) via providers/mlb.py.
"""

from providers import mlb as mlb_provider

LEAGUES = {
    "mlb": {"code": "1"},
}


def fetch_matches(league: str = "mlb") -> dict:
    return mlb_provider.matches(LEAGUES[league]["code"])


def fetch_standings(league: str = "mlb") -> dict:
    return mlb_provider.standings(LEAGUES[league]["code"])


def fetch_teams(league: str = "mlb") -> dict:
    return mlb_provider.teams(LEAGUES[league]["code"])


def fetch_team_detail(league: str, team_id) -> dict:
    return mlb_provider.team_detail(LEAGUES[league]["code"], team_id)
