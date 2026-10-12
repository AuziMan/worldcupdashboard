"""football-data.org provider — powers wc (World Cup) and epl (Premier League)
via sports/soccer.py. Our API key's TIER_ONE plan covers both competitions.
"""

from datetime import datetime, timedelta, timezone

import requests

from config import API_KEY, FOOTBALL_DATA_BASE_URL


def _headers():
    return {"X-Auth-Token": API_KEY}


def _get(path: str, params: dict | None = None) -> dict:
    r = requests.get(f"{FOOTBALL_DATA_BASE_URL}{path}", headers=_headers(), params=params, timeout=10)
    r.raise_for_status()
    return r.json()


# Unlike the ESPN/UFC providers, this API takes one request regardless of
# window width, so "scope" here is just about trimming the response payload,
# not request count. The unscoped default stays exactly what it's always
# been — the whole competition's matches, no date filter at all — since
# every existing caller (BracketView, MatchSection's Past tab, standings)
# relies on that full season being there. "today"/"future" are new, used
# only by the homepage's live rail (see providers/espn.py's _day_offsets()
# docstring for why there's no "past" scope); bounded to the same ±45-day
# window the ESPN/MLB providers use, rather than left open-ended, so a
# mid-season "future" request doesn't pull the rest of the season.
def matches(code: str, scope: str = "all") -> dict:
    if scope == "all":
        return _get(f"/competitions/{code}/matches")
    today = datetime.now(timezone.utc).date()
    if scope == "today":
        date_from = date_to = today
    else:  # "future"
        date_from, date_to = today + timedelta(days=1), today + timedelta(days=45)
    params = {"dateFrom": date_from.isoformat(), "dateTo": date_to.isoformat()}
    return _get(f"/competitions/{code}/matches", params=params)


def standings(code: str) -> dict:
    return _get(f"/competitions/{code}/standings")


def teams(code: str) -> dict:
    return _get(f"/competitions/{code}/teams")


def team_detail(code: str, team_id: int) -> dict:
    return _get(f"/teams/{team_id}")
