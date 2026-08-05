"""Soccer: wc (World Cup) and epl (Premier League) are both served by
football-data.org (our key's TIER_ONE plan covers both). mls is served by
the ESPN provider instead — football-data.org doesn't offer MLS at any tier.
"""

from providers import espn, football_data

LEAGUES = {
    "wc": {"provider": "football-data", "code": "WC"},
    "epl": {"provider": "football-data", "code": "PL"},
    "mls": {"provider": "espn", "sport": "soccer", "code": "usa.1"},
}


def fetch_matches(league: str) -> dict:
    cfg = LEAGUES[league]
    if cfg["provider"] == "espn":
        return espn.matches(cfg["sport"], cfg["code"])
    return football_data.matches(cfg["code"])


def fetch_standings(league: str) -> dict:
    cfg = LEAGUES[league]
    if cfg["provider"] == "espn":
        return espn.standings(cfg["sport"], cfg["code"])
    return football_data.standings(cfg["code"])


def fetch_teams(league: str) -> dict:
    cfg = LEAGUES[league]
    if cfg["provider"] == "espn":
        return espn.teams(cfg["sport"], cfg["code"])
    return football_data.teams(cfg["code"])


def fetch_team_detail(league: str, team_id) -> dict:
    cfg = LEAGUES[league]
    if cfg["provider"] == "espn":
        return espn.team_detail(cfg["sport"], cfg["code"], team_id)
    return football_data.team_detail(cfg["code"], team_id)
