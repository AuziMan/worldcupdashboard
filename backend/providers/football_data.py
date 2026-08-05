"""football-data.org provider — powers wc (World Cup) and epl (Premier League)
via sports/soccer.py. Our API key's TIER_ONE plan covers both competitions.
"""

import requests

from config import API_KEY, FOOTBALL_DATA_BASE_URL


def _headers():
    return {"X-Auth-Token": API_KEY}


def _get(path: str) -> dict:
    r = requests.get(f"{FOOTBALL_DATA_BASE_URL}{path}", headers=_headers(), timeout=10)
    r.raise_for_status()
    return r.json()


def matches(code: str) -> dict:
    return _get(f"/competitions/{code}/matches")


def standings(code: str) -> dict:
    return _get(f"/competitions/{code}/standings")


def teams(code: str) -> dict:
    return _get(f"/competitions/{code}/teams")


def team_detail(code: str, team_id: int) -> dict:
    return _get(f"/teams/{team_id}")
