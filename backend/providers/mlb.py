"""MLB Stats API provider — undocumented endpoints that power MLB.com and the
MLB app. No auth, no published rate limit. Unlike ESPN's soccer scoreboard/
standings, the schedule and standings responses only embed bare {id, name}
team stubs (no crest/abbreviation), so matches() and standings() each need
one extra call to /teams to resolve display info.
"""

from datetime import datetime, timedelta, timezone

import requests

MLB_STATS_BASE_URL = "https://statsapi.mlb.com/api/v1"
LOGO_BASE_URL = "https://www.mlbstatic.com/team-logos"
HEADSHOT_BASE_URL = "https://img.mlbstatic.com/mlb-photos/image/upload/w_213,d_people:generic:headshot:silo:current.png,q_auto:best,f_auto/v1/people"

STATUS_MAP = {
    "Scheduled": "SCHEDULED",
    "Pre-Game": "SCHEDULED",
    "Warmup": "SCHEDULED",
    "In Progress": "IN_PLAY",
    "Manager Challenge": "IN_PLAY",
    "Instant Replay": "IN_PLAY",
    "Umpire Review": "IN_PLAY",
    "Delayed Start": "SCHEDULED",
    "Delayed": "SUSPENDED",
    "Suspended": "SUSPENDED",
    "Postponed": "POSTPONED",
    "Cancelled": "CANCELLED",
    "Final": "FINISHED",
    "Game Over": "FINISHED",
    "Completed Early": "FINISHED",
}

ABSTRACT_STATUS_MAP = {
    "Preview": "SCHEDULED",
    "Live": "IN_PLAY",
    "Final": "FINISHED",
}

INNING_STATE_LABELS = {
    "Top": "Top",
    "Bottom": "Bot",
    "Middle": "Mid",
    "End": "End",
}

# Postseason gameType codes only — regular season/spring/all-star games get no stage.
GAME_TYPE_STAGE = {
    "F": "WILD_CARD",
    "D": "DIVISION_SERIES",
    "L": "LEAGUE_CHAMPIONSHIP",
    "W": "WORLD_SERIES",
}


def _get(path: str) -> dict:
    r = requests.get(f"{MLB_STATS_BASE_URL}{path}", timeout=10)
    r.raise_for_status()
    return r.json()


def _team(team_json: dict) -> dict:
    team_id = team_json.get("id")
    return {
        "id": team_id,
        "name": team_json.get("name"),
        "shortName": team_json.get("teamName") or team_json.get("name"),
        "crest": f"{LOGO_BASE_URL}/{team_id}.svg" if team_id else None,
    }


def _team_lookup(sport_id: str) -> dict:
    data = _get(f"/teams?sportId={sport_id}")
    return {t["id"]: _team(t) for t in data.get("teams", []) if t.get("id")}


def _status(status_json: dict) -> str:
    detailed = status_json.get("detailedState")
    if detailed in STATUS_MAP:
        return STATUS_MAP[detailed]
    return ABSTRACT_STATUS_MAP.get(status_json.get("abstractGameState"), "SCHEDULED")


def _period(linescore: dict) -> str | None:
    ordinal = linescore.get("currentInningOrdinal")
    if not ordinal:
        return None
    label = INNING_STATE_LABELS.get(linescore.get("inningState"))
    return f"{label} {ordinal}" if label else ordinal


def matches(sport_id: str) -> dict:
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=45)).strftime("%Y-%m-%d")
    end = (now + timedelta(days=45)).strftime("%Y-%m-%d")
    data = _get(f"/schedule?sportId={sport_id}&startDate={start}&endDate={end}&hydrate=linescore")
    team_lookup = _team_lookup(sport_id)

    results = []
    for date_entry in data.get("dates", []):
        for game in date_entry.get("games", []):
            teams = game.get("teams", {})
            home = teams.get("home", {})
            away = teams.get("away", {})

            def resolve_team(side):
                stub = side.get("team", {})
                return team_lookup.get(stub.get("id")) or {
                    "id": stub.get("id"), "name": stub.get("name"), "shortName": stub.get("name"), "crest": None,
                }

            # Baseball has no minute-count equivalent — innings aren't a fixed
            # duration, so "minute" is left unset rather than approximated.
            # "period" carries the inning (e.g. "Top 5th") instead.
            results.append({
                "id": game.get("gamePk"),
                "utcDate": game.get("gameDate"),
                "status": _status(game.get("status", {})),
                "minute": None,
                "period": _period(game.get("linescore") or {}),
                "stage": GAME_TYPE_STAGE.get(game.get("gameType")),
                "group": None,
                "homeTeam": resolve_team(home),
                "awayTeam": resolve_team(away),
                "score": {"fullTime": {"home": home.get("score"), "away": away.get("score")}},
            })

    return {"matches": results}


def standings(sport_id: str) -> dict:
    year = datetime.now(timezone.utc).year
    data = _get(f"/standings?leagueId=103,104&season={year}&hydrate=division")
    team_lookup = _team_lookup(sport_id)

    groups = []
    for record in data.get("records", []):
        table = []
        for entry in record.get("teamRecords", []):
            team_stub = entry.get("team", {})
            team = team_lookup.get(team_stub.get("id")) or {
                "id": team_stub.get("id"), "name": team_stub.get("name"), "shortName": team_stub.get("name"), "crest": None,
            }
            # Baseball has no "points" stat — wins is the closest sortable/displayable analog.
            table.append({
                "position": int(entry.get("divisionRank", 0)),
                "team": team,
                "playedGames": entry.get("gamesPlayed", 0),
                "won": entry.get("wins", 0),
                "draw": (entry.get("leagueRecord") or {}).get("ties", 0),
                "lost": entry.get("losses", 0),
                "goalsFor": entry.get("runsScored", 0),
                "goalsAgainst": entry.get("runsAllowed", 0),
                "goalDifference": entry.get("runDifferential", 0),
                "points": entry.get("wins", 0),
            })
        table.sort(key=lambda row: row["position"])
        division = record.get("division") or {}
        groups.append({"group": division.get("nameShort") or division.get("name"), "table": table})

    return {"standings": groups}


def teams(sport_id: str) -> dict:
    data = _get(f"/teams?sportId={sport_id}")
    return {"teams": [_team(t) for t in data.get("teams", [])]}


def team_detail(sport_id: str, team_id) -> dict:
    data = _get(f"/teams/{team_id}/roster")
    squad = []
    for entry in data.get("roster", []):
        person = entry.get("person", {})
        person_id = person.get("id")
        squad.append({
            "id": person_id,
            "name": person.get("fullName"),
            "position": (entry.get("position") or {}).get("type"),
            "photo": f"{HEADSHOT_BASE_URL}/{person_id}/headshot/67/current" if person_id else None,
            "jersey": entry.get("jerseyNumber"),
        })
    return {"coach": None, "squad": squad}
