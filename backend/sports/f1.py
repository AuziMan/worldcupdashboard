"""F1 gets its own provider(s), same reasoning as sports/ufc.py: a Grand
Prix weekend is many sessions (practice/qualifying/sprint/race) with ~20
drivers each, not a home/away pair, so it doesn't fit espn.matches()/
standings()/teams(). Two upstream providers split the work — see their
docstrings: providers/openf1.py (schedule/sessions/live positions) and
providers/f1.py (ESPN, championship standings only). /teams and /teams/<id>
return empty stubs rather than erroring — neither provider has reliable
constructor-roster data.
"""

from providers import f1 as f1_provider
from providers import openf1 as openf1_provider

LEAGUES = {
    "f1": {},
}


def fetch_matches(league: str = "f1") -> dict:
    return openf1_provider.matches()


def fetch_standings(league: str = "f1") -> dict:
    return f1_provider.standings()


def fetch_teams(league: str = "f1") -> dict:
    return {"teams": []}


def fetch_team_detail(league: str, team_id) -> dict:
    return {"coach": None, "squad": []}
