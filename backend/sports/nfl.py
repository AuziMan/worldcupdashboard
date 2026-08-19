"""NFL reuses the ESPN provider (football is a third sport family on the
same site API) rather than a new provider module — same reasoning as
sports/nba.py for basketball. Standings come back as a flat 16-team table
per conference (AFC/NFC); ESPN's default standings endpoint doesn't break
teams out by division, so neither do we (same simplification already made
for nba's conference-only standings).

fetch_team_detail is overridden to return an empty stub rather than call
espn.team_detail(): ESPN's football roster endpoint groups athletes by
position (`{"position": "offense", "items": [...]}`) instead of returning
the flat per-athlete list soccer/basketball/baseball rosters use, so
espn.team_detail()'s parsing doesn't apply — same empty-stub approach
sports/ufc.py takes for its missing roster endpoint. The frontend's NFL
config has no Teams tab, so this only guards the raw API route.
"""

from providers import espn

LEAGUES = {
    "nfl": {"sport": "football", "code": "nfl"},
}


def fetch_matches(league: str = "nfl") -> dict:
    cfg = LEAGUES[league]
    return espn.matches(cfg["sport"], cfg["code"])


def fetch_standings(league: str = "nfl") -> dict:
    cfg = LEAGUES[league]
    return espn.standings(cfg["sport"], cfg["code"])


def fetch_teams(league: str = "nfl") -> dict:
    cfg = LEAGUES[league]
    return espn.teams(cfg["sport"], cfg["code"])


def fetch_team_detail(league: str, team_id) -> dict:
    return {"coach": None, "squad": []}
