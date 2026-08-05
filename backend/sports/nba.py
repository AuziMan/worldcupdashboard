"""NBA reuses the ESPN provider (basketball is a second sport family on the
same site API) rather than a new provider module. The official stats.nba.com
API was deliberately not used — it blocks datacenter/cloud IPs, which would
break once deployed to Render even though it might appear to work locally.
"""

from providers import espn

LEAGUES = {
    "nba": {"sport": "basketball", "code": "nba"},
}


def fetch_matches(league: str = "nba") -> dict:
    cfg = LEAGUES[league]
    return espn.matches(cfg["sport"], cfg["code"])


def fetch_standings(league: str = "nba") -> dict:
    cfg = LEAGUES[league]
    return espn.standings(cfg["sport"], cfg["code"])


def fetch_teams(league: str = "nba") -> dict:
    cfg = LEAGUES[league]
    return espn.teams(cfg["sport"], cfg["code"])


def fetch_team_detail(league: str, team_id) -> dict:
    cfg = LEAGUES[league]
    return espn.team_detail(cfg["sport"], cfg["code"], team_id)
