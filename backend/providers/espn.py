"""Generic ESPN site-api client — undocumented endpoints that power espn.com.
No auth, no published rate limit. Sport-aware via ESPN_SPORTS (base URLs +
the standings rank-stat key, which differs by sport — soccer uses "rank",
basketball and football use "playoffSeed"). Shared by four sport modules:
sports/soccer.py (mls), sports/nba.py (nba), sports/nfl.py (nfl), and
sports/ncaaf.py (ncaaf) — it's one HTTP client for four sport families on
the same underlying API, not duplicated per sport.

College football (ncaaf) reuses "football"'s ESPN_SPORTS entry with
code="college-football" for matches() only — its standings/teams/roster
shapes each differ enough from the generic parsing (and from NFL's own
football_team_detail()) to need their own college_football_*() functions
below; see each one's docstring for why.

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
    # ESPN's scoreboard endpoint silently caps at 100 events regardless of the
    # requested date range and returns them in chronological order — for a
    # busy league (e.g. MLS) with >100 already-played games earlier in the
    # 90-day window, that cap gets eaten entirely by the past, so every
    # upcoming/SCHEDULED fixture quietly gets truncated off. `limit=1000`
    # lifts that cap; confirmed against the raw endpoint (100 events without
    # it, 219 — including SCHEDULED ones — with it).
    data = _get(f"{cfg['base']}/{code}/scoreboard?dates={start}-{end}&limit=1000")

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


COLLEGE_FOOTBALL_BASE = f"{ESPN_SPORTS['football']['base']}/college-football"
COLLEGE_FOOTBALL_STANDINGS_URL = (
    f"{ESPN_SPORTS['football']['standings_base']}/college-football/standings"
)
COLLEGE_FOOTBALL_RANKINGS_URL = f"{COLLEGE_FOOTBALL_BASE}/rankings"


def _college_football_ap_ranks() -> dict:
    """team id -> current AP Top 25 rank. This is the one enrichment college
    football gets that no other sport here has — a national ranking
    independent of any team's own conference standings. ESPN's /rankings
    endpoint also carries a Coaches poll plus FCS/D-II polls; AP is the one
    most fans mean by "the rankings", so that's the only one surfaced.
    Teams outside the top 25 (the overwhelming majority) simply get no
    "rank" key at all — there's no "NR" badge worth rendering for them."""
    data = _get(COLLEGE_FOOTBALL_RANKINGS_URL)
    ap_poll = next(
        (p for p in data.get("rankings", []) if p.get("name") == "AP Top 25"),
        None,
    )
    if not ap_poll:
        return {}
    return {
        r["team"]["id"]: r["current"]
        for r in ap_poll.get("ranks", [])
        if r.get("team", {}).get("id") is not None
    }


def _walk_standings_groups(node: dict):
    """Yield (group_name, entries) for every node in a standings tree that
    carries its own entries. Most college football conferences report a flat
    list directly under themselves, but at least one (Sun Belt) reports zero
    entries at the conference level and nests two divisions ("Sun Belt -
    East"/"-West") one level deeper instead — recursing means both shapes
    come out as plain (name, entries) groups with no special-casing."""
    standings_block = node.get("standings") or {}
    entries = standings_block.get("entries")
    if entries:
        yield node.get("name"), entries
    for child in node.get("children", []):
        yield from _walk_standings_groups(child)


def college_football_standings() -> dict:
    """ESPN's college football standings entries can't be parsed by the
    generic standings() above: each entry repeats stat *names* ("wins",
    "pointsFor", ...) once per record split (overall/home/away/vs-division/
    vs-conference/vs-ranked-opponents/...), so a dict keyed by name silently
    keeps whichever split happened to come last (mostly zeroes) instead of
    the season totals. Keying by each stat's `type` instead — unique per
    split, e.g. "wins" vs "homerecord_wins" — picks out the right one. There
    is also no explicit "losses" stat at all; it only exists baked into the
    "overall" split's "W-L" summary string, so it's parsed out of that.
    """
    data = _get(COLLEGE_FOOTBALL_STANDINGS_URL)
    rank_key = ESPN_SPORTS["football"]["rank_key"].lower()
    ap_ranks = _college_football_ap_ranks()

    groups = []
    for name, entries in _walk_standings_groups(data):
        table = []
        for entry in entries:
            stat_by_type = {s.get("type"): s for s in entry.get("stats", [])}
            wins = int(stat_by_type.get("wins", {}).get("value") or 0)
            record = (stat_by_type.get("total", {}).get("summary") or "0-0").split("-")
            losses = int(record[1]) if len(record) > 1 and record[1].strip().isdigit() else 0
            team = _team(entry.get("team", {}))
            if team.get("id") in ap_ranks:
                team["rank"] = ap_ranks[team["id"]]
            table.append({
                "position": int(stat_by_type.get(rank_key, {}).get("value") or 0),
                "team": team,
                "playedGames": wins + losses,
                "won": wins,
                "draw": 0,
                "lost": losses,
                "goalsFor": int(stat_by_type.get("pointsfor", {}).get("value") or 0),
                "goalsAgainst": int(stat_by_type.get("pointsagainst", {}).get("value") or 0),
                "goalDifference": int(stat_by_type.get("pointdifferential", {}).get("value") or 0),
                "points": wins,
            })
        table.sort(key=lambda row: row["position"])
        groups.append({"group": name, "table": table})

    return {"standings": groups}


def college_football_teams() -> dict:
    """ESPN's plain /teams endpoint returns every college football division
    at once (FBS, FCS, D2, D3 — 761 teams) with no groups= filter that
    actually narrows it, which is far more than "college football" means to
    a visitor here. The standings endpoint is already properly scoped to
    FBS's ~11 conferences, so the team list is derived from that tree
    instead (~138 teams) rather than the noisy /teams response."""
    data = _get(COLLEGE_FOOTBALL_STANDINGS_URL)
    ap_ranks = _college_football_ap_ranks()
    seen = {}
    for _, entries in _walk_standings_groups(data):
        for entry in entries:
            team = _team(entry.get("team", {}))
            if team.get("id"):
                if team["id"] in ap_ranks:
                    team["rank"] = ap_ranks[team["id"]]
                seen[team["id"]] = team
    return {"teams": sorted(seen.values(), key=lambda t: t.get("name") or "")}


def college_football_matches() -> dict:
    """Adds each team's current AP Top 25 rank on top of the generic
    matches() shape above — the same enrichment college_football_standings()
    and college_football_teams() do, extended to the scoreboard. Lives here
    rather than in matches() itself since no other sport it's shared with
    (soccer/basketball/NFL) has a comparable national ranking to attach."""
    data = matches("football", "college-football")
    ap_ranks = _college_football_ap_ranks()
    if ap_ranks:
        for event in data["matches"]:
            for side in ("homeTeam", "awayTeam"):
                team = event.get(side) or {}
                if team.get("id") in ap_ranks:
                    team["rank"] = ap_ranks[team["id"]]
    return data


def college_football_team_detail(team_id) -> dict:
    """Reuses football's grouped-by-unit roster shape (see
    football_team_detail above), but can't reuse its labels: a college
    athlete's "college" field is just the team whose roster we're already
    viewing (not an alma mater, unlike an NFL player's), and "experience" is
    a class year (Freshman/Sophomore/Junior/Senior) rather than professional
    experience — so this surfaces class year as "Class" and drops the
    self-referential college name instead."""
    data = _get(f"{COLLEGE_FOOTBALL_BASE}/teams/{team_id}/roster")
    squad = []
    for group in data.get("athletes", []):
        for athlete in group.get("items", []):
            experience = athlete.get("experience") or {}
            stats = {}
            if experience.get("displayValue"):
                stats["Class"] = experience["displayValue"]

            squad.append({
                "id": athlete.get("id"),
                "name": athlete.get("displayName"),
                "position": (athlete.get("position") or {}).get("displayName"),
                "photo": (athlete.get("headshot") or {}).get("href"),
                "jersey": athlete.get("jersey"),
                "age": athlete.get("age"),
                "dateOfBirth": athlete.get("dateOfBirth"),
                "nationality": (athlete.get("birthPlace") or {}).get("country"),
                "height": athlete.get("displayHeight"),
                "weight": athlete.get("displayWeight"),
                "stats": stats,
            })
    return {"coach": None, "squad": squad}


def football_team_detail(code: str, team_id) -> dict:
    """Football's roster groups athletes by unit (offense/defense/specialTeam/
    injuredReserveOrOut/suspended/practiceSquad) instead of returning the flat
    per-athlete list soccer/basketball/baseball rosters use — team_detail()
    can't parse that shape (see module docstring), which is why sports/nfl.py
    used to stub this out entirely. This flattens every group into one squad
    list, keyed by each athlete's own specific position (e.g. "Quarterback",
    "Guard") rather than the coarse group label, same as soccer/basketball
    already do. No citizenship field exists on a football athlete, so
    birthPlace.country stands in for nationality; college and years of
    NFL experience — both present and football-relevant, unlike soccer's
    goals/assists — become the roster's "stats" instead."""
    cfg = ESPN_SPORTS["football"]
    data = _get(f"{cfg['base']}/{code}/teams/{team_id}/roster")
    squad = []
    for group in data.get("athletes", []):
        for athlete in group.get("items", []):
            college = athlete.get("college") or {}
            experience = athlete.get("experience") or {}
            stats = {}
            if college.get("name"):
                stats["College"] = college["name"]
            if experience.get("years") is not None:
                stats["NFL experience"] = f"{experience['years']} yrs"

            squad.append({
                "id": athlete.get("id"),
                "name": athlete.get("displayName"),
                "position": (athlete.get("position") or {}).get("displayName"),
                "photo": (athlete.get("headshot") or {}).get("href"),
                "jersey": athlete.get("jersey"),
                "age": athlete.get("age"),
                "dateOfBirth": athlete.get("dateOfBirth"),
                "nationality": (athlete.get("birthPlace") or {}).get("country"),
                "height": athlete.get("displayHeight"),
                "weight": athlete.get("displayWeight"),
                "stats": stats,
            })
    return {"coach": None, "squad": squad}
