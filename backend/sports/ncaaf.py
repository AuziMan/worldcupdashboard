"""NCAA (FBS) college football — reuses the ESPN provider's "football" sport
family (code="college-football", alongside NFL's code="nfl"), but every
fetch_*() here calls a college-football-specific espn function rather than
the generic/NFL ones — see providers/espn.py's college_football_*()
docstrings for why (repeated stat names per standings record split, an
unfiltered 761-team /teams endpoint, roster labels that only make sense for
a pro, and — the one enrichment no other sport here has — each team's
current AP Top 25 rank layered on top of matches/standings/teams).
"""

from providers import espn

LEAGUES = {
    "ncaaf": {"sport": "football", "code": "college-football"},
}


def fetch_matches(league: str = "ncaaf") -> dict:
    return espn.college_football_matches()


def fetch_standings(league: str = "ncaaf") -> dict:
    return espn.college_football_standings()


def fetch_teams(league: str = "ncaaf") -> dict:
    return espn.college_football_teams()


def fetch_team_detail(league: str, team_id) -> dict:
    return espn.college_football_team_detail(team_id)
