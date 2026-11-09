"""football-data.org provider — powers wc (World Cup) and epl (Premier League)
via sports/soccer.py. Our API key's TIER_ONE plan covers both competitions.
"""

from datetime import datetime, timedelta, timezone

import requests

from config import API_KEY, FOOTBALL_DATA_BASE_URL
from scopes import day_bounds


def _headers():
    return {"X-Auth-Token": API_KEY}


def _get(path: str, params: dict | None = None) -> dict:
    r = requests.get(f"{FOOTBALL_DATA_BASE_URL}{path}", headers=_headers(), params=params, timeout=10)
    r.raise_for_status()
    return r.json()


# Unlike the ESPN/UFC providers, this API takes one request regardless of
# window width, so "scope" here is just about trimming the response payload
# (and so the first paint), not request count. The unscoped default stays
# exactly what it's always been — the whole competition's matches, no date
# filter at all — and the scoped slices are bounded to a year either side,
# so that today + soon + later + past together still cover a full season
# (BracketView, MatchSection's Past tab and standings rely on all of it).
SEASON_DAYS = 366


def matches(code: str, scope: str = "all") -> dict:
    if scope == "all":
        return _get(f"/competitions/{code}/matches")
    first, last = day_bounds(scope, past=SEASON_DAYS, future=SEASON_DAYS)
    today = datetime.now(timezone.utc).date()
    params = {
        "dateFrom": (today + timedelta(days=first)).isoformat(),
        "dateTo": (today + timedelta(days=last)).isoformat(),
    }
    return _get(f"/competitions/{code}/matches", params=params)


def standings(code: str) -> dict:
    return _get(f"/competitions/{code}/standings")


def teams(code: str) -> dict:
    return _get(f"/competitions/{code}/teams")


def team_detail(code: str, team_id: int) -> dict:
    return _get(f"/teams/{team_id}")
