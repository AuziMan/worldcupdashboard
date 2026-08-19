"""Generic ESPN site-api client — undocumented endpoints that power espn.com.
No auth, no published rate limit. Sport-aware via ESPN_SPORTS (base URLs +
the standings rank-stat key, which differs by sport — soccer uses "rank",
basketball and football use "playoffSeed"). Shared by three sport modules:
sports/soccer.py (mls), sports/nba.py (nba), and sports/nfl.py (nfl) — it's
one HTTP client for three sport families on the same underlying API, not
duplicated per sport.

Normalizes ESPN's JSON into the exact shape providers/football_data.py
already returns, so routes/sports code doesn't need to know which provider
served a given league.
"""

from datetime import datetime, timedelta, timezone

import requests

ESPN_SPORTS = {
    "soccer": {
        "base": "https://site.api.espn.com/apis/site/v2/sports/soccer",
        "standings_base": "https://site.api.espn.com/apis/v2/sports/soccer",
        "rank_key": "rank",
    },
    "basketball": {
        "base": "https://site.api.espn.com/apis/site/v2/sports/basketball",
        "standings_base": "https://site.api.espn.com/apis/v2/sports/basketball",
        "rank_key": "playoffSeed",
    },
    "football": {
        "base": "https://site.api.espn.com/apis/site/v2/sports/football",
        "standings_base": "https://site.api.espn.com/apis/v2/sports/football",
        "rank_key": "playoffSeed",
    },
}

STATUS_MAP = {
    "STATUS_SCHEDULED": "SCHEDULED",
    "STATUS_IN_PROGRESS": "IN_PLAY",
    "STATUS_FIRST_HALF": "IN_PLAY",
    "STATUS_SECOND_HALF": "IN_PLAY",
    "STATUS_HALFTIME": "PAUSED",
    "STATUS_FINAL": "FINISHED",
    "STATUS_FULL_TIME": "FINISHED",
    "STATUS_POSTPONED": "POSTPONED",
    "STATUS_CANCELED": "CANCELLED",
    "STATUS_SUSPENDED": "SUSPENDED",
    "STATUS_DELAYED": "SUSPENDED",
}

POSITION_MAP = {
    "Goalkeeper": "Goalkeeper",
    "Defender": "Defence",
    "Midfielder": "Midfield",
    "Forward": "Offence",
}


def _get(url: str) -> dict:
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()


def _team(team_json: dict) -> dict:
    logos = team_json.get("logos") or []
    crest = team_json.get("logo") or (logos[0]["href"] if logos else None)
    return {
        "id": team_json.get("id"),
        "name": team_json.get("displayName"),
        "shortName": team_json.get("shortDisplayName") or team_json.get("abbreviation"),
        "crest": crest,
    }


def _minute(status: dict) -> int | None:
    clock = status.get("displayClock", "").strip("'")
    return int(clock) if clock.isdigit() else None


def matches(sport: str, code: str) -> dict:
    cfg = ESPN_SPORTS[sport]
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=45)).strftime("%Y%m%d")
    end = (now + timedelta(days=45)).strftime("%Y%m%d")
    data = _get(f"{cfg['base']}/{code}/scoreboard?dates={start}-{end}")

    results = []
    for event in data.get("events", []):
        comp = (event.get("competitions") or [{}])[0]
        status_type = comp.get("status", {}).get("type", {})
        status = STATUS_MAP.get(status_type.get("name"), "SCHEDULED")

        competitors = comp.get("competitors", [])
        home = next((c for c in competitors if c.get("homeAway") == "home"), {})
        away = next((c for c in competitors if c.get("homeAway") == "away"), {})

        def score(c):
            val = c.get("score")
            if val in (None, ""):
                return None
            try:
                return int(val)
            except (TypeError, ValueError):
                # Malformed score from ESPN shouldn't take down the whole feed —
                # degrade this one field to "unavailable" instead.
                return None

        results.append({
            "id": event.get("id"),
            "utcDate": event.get("date"),
            "status": status,
            "minute": _minute(comp.get("status", {})) if status == "IN_PLAY" else None,
            "stage": None,
            "group": None,
            "homeTeam": _team(home.get("team", {})),
            "awayTeam": _team(away.get("team", {})),
            "score": {"fullTime": {"home": score(home), "away": score(away)}},
        })

    return {"matches": results}


def standings(sport: str, code: str) -> dict:
    cfg = ESPN_SPORTS[sport]
    data = _get(f"{cfg['standings_base']}/{code}/standings")

    groups = []
    for child in data.get("children", []):
        table = []
        for entry in child.get("standings", {}).get("entries", []):
            stats = {s.get("name"): s.get("value") for s in entry.get("stats", [])}
            wins = int(stats.get("wins", 0))
            losses = int(stats.get("losses", 0))
            # Some sports (basketball, football) don't have a "points" stat that
            # means anything standard — wins is the closest sortable/displayable analog.
            points = wins if sport in ("basketball", "football") else int(stats.get("points", 0))
            table.append({
                "position": int(stats.get(cfg["rank_key"], 0)),
                "team": _team(entry.get("team", {})),
                "playedGames": int(stats.get("gamesPlayed") or (wins + losses)),
                "won": wins,
                "draw": int(stats.get("ties", 0)),
                "lost": losses,
                "goalsFor": int(stats.get("pointsFor", 0)),
                "goalsAgainst": int(stats.get("pointsAgainst", 0)),
                "goalDifference": int(stats.get("pointDifferential", 0)),
                "points": points,
            })
        table.sort(key=lambda row: row["position"])
        groups.append({"group": child.get("name"), "table": table})

    return {"standings": groups}


def teams(sport: str, code: str) -> dict:
    cfg = ESPN_SPORTS[sport]
    data = _get(f"{cfg['base']}/{code}/teams")
    sports_list = data.get("sports") or [{}]
    leagues = sports_list[0].get("leagues") or [{}]
    team_list = [_team(t.get("team", {})) for t in leagues[0].get("teams", [])]
    return {"teams": team_list}


def team_detail(sport: str, code: str, team_id) -> dict:
    cfg = ESPN_SPORTS[sport]
    data = _get(f"{cfg['base']}/{code}/teams/{team_id}/roster")
    squad = []
    for athlete in data.get("athletes", []):
        position = (athlete.get("position") or {}).get("displayName")
        stat_values = {}
        categories = (
            athlete.get("statistics", {})
            .get("splits", {})
            .get("categories", [])
        )
        for category in categories:
            for stat in category.get("stats", []):
                stat_values[stat.get("name")] = stat.get("displayValue")

        selected_stats = {}
        for key, label in [
            ("appearances", "Apps"),
            ("totalGoals", "Goals"),
            ("goalAssists", "Assists"),
            ("saves", "Saves"),
            ("goalsConceded", "Goals against"),
            ("yellowCards", "Yellow cards"),
        ]:
            if stat_values.get(key) is not None:
                selected_stats[label] = stat_values[key]

        squad.append({
            "id": athlete.get("id"),
            "name": athlete.get("displayName"),
            "position": POSITION_MAP.get(position, position),
            "photo": (athlete.get("headshot") or {}).get("href"),
            "jersey": athlete.get("jersey"),
            "age": athlete.get("age"),
            "dateOfBirth": athlete.get("dateOfBirth"),
            "nationality": athlete.get("citizenship"),
            "height": athlete.get("displayHeight"),
            "weight": athlete.get("displayWeight"),
            "stats": selected_stats,
        })
    return {"coach": None, "squad": squad}
