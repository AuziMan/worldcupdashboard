"""UFC gets its own provider ("espn_ufc") rather than a third ESPN_SPORTS
entry: MMA has no team/standings concept — fights get flattened one-per-entry
into "matches" and "standings" carries divisional rankings instead of a
table. /teams and /teams/<id> return empty stubs rather than erroring, since
there's no fighter-roster endpoint yet and nothing should fall through to
the football-data.org branch.
"""

from providers import ufc as ufc_provider

LEAGUES = {
    "ufc": {},
}


def fetch_matches(league: str = "ufc") -> dict:
    return ufc_provider.matches()


def fetch_standings(league: str = "ufc") -> dict:
    return ufc_provider.standings()


def fetch_teams(league: str = "ufc") -> dict:
    return {"teams": []}


def fetch_team_detail(league: str, team_id) -> dict:
    return {"coach": None, "squad": []}
