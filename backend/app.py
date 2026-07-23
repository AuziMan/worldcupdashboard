from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import hashlib
import requests
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

ALLOWED_ORIGINS = [
    "https://auziman.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS(app, origins=ALLOWED_ORIGINS)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute"],
    storage_uri="memory://",
)

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
REFRESH_SECRET = os.getenv("REFRESH_SECRET", "")
REDIS_URL = os.getenv("UPSTASH_REDIS_REST_URL", "")
REDIS_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4"
# Per-sport config for the ESPN provider. "rank_key" is the standings stat name
# that carries a team's position within its group — it differs by sport (soccer
# has "rank", basketball has "playoffSeed" instead).
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
}
MLB_STATS_BASE_URL = "https://statsapi.mlb.com/api/v1"
MLB_LOGO_BASE_URL = "https://www.mlbstatic.com/team-logos"
CACHE_TTL_DEFAULT = timedelta(seconds=60)
CACHE_TTL_LIVE = timedelta(seconds=60)

# Every league the frontend can request. "wc" and "epl" are both served by
# football-data.org (our key already covers both at the same TIER_ONE plan).
# football-data.org doesn't offer MLS at any tier, so "mls" is served by
# ESPN's undocumented site API instead, normalized into the same shape below.
# "mlb" is served by MLB's own undocumented statsapi.mlb.com (no key needed) —
# it isn't wired into the frontend's league switcher (App.jsx) yet, so it's
# reachable via the API but not shown in the UI. "nba" also reuses the ESPN
# provider (basketball is a second sport family on the same site API) rather
# than a new provider module — the official stats.nba.com API was rejected
# because it blocks datacenter/cloud IPs, which would break on Render.
LEAGUES = {
    "wc": {"provider": "football-data", "code": "WC"},
    "epl": {"provider": "football-data", "code": "PL"},
    "mls": {"provider": "espn", "sport": "soccer", "code": "usa.1"},
    "mlb": {"provider": "mlbstats", "code": "1"},
    "nba": {"provider": "espn", "sport": "basketball", "code": "nba"},
}

_cache: dict = {}

try:
    from upstash_redis import Redis
    _redis = Redis(url=REDIS_URL, token=REDIS_TOKEN) if REDIS_URL and REDIS_TOKEN else None
except Exception:
    _redis = None


# ─────────────────────────── football-data.org provider ───────────────────────────

def _football_data_headers():
    return {"X-Auth-Token": API_KEY}


def _football_data_get(path: str) -> dict:
    r = requests.get(f"{FOOTBALL_DATA_BASE_URL}{path}", headers=_football_data_headers(), timeout=10)
    r.raise_for_status()
    return r.json()


def _fd_matches(code: str) -> dict:
    return _football_data_get(f"/competitions/{code}/matches")


def _fd_standings(code: str) -> dict:
    return _football_data_get(f"/competitions/{code}/standings")


def _fd_teams(code: str) -> dict:
    return _football_data_get(f"/competitions/{code}/teams")


def _fd_team_detail(code: str, team_id: int) -> dict:
    return _football_data_get(f"/teams/{team_id}")


# ─────────────────────────────── ESPN provider ───────────────────────────────
# Undocumented endpoints that power espn.com. No auth, no published rate limit.
# Normalized here into the exact shape the football-data.org functions above
# already return, so frontend components don't need to know which provider
# served a given league.

ESPN_STATUS_MAP = {
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

ESPN_POSITION_MAP = {
    "Goalkeeper": "Goalkeeper",
    "Defender": "Defence",
    "Midfielder": "Midfield",
    "Forward": "Offence",
}


def _espn_get(url: str) -> dict:
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()


def _espn_team(team_json: dict) -> dict:
    logos = team_json.get("logos") or []
    crest = team_json.get("logo") or (logos[0]["href"] if logos else None)
    return {
        "id": team_json.get("id"),
        "name": team_json.get("displayName"),
        "shortName": team_json.get("shortDisplayName") or team_json.get("abbreviation"),
        "crest": crest,
    }


def _espn_minute(status: dict) -> int | None:
    clock = status.get("displayClock", "").strip("'")
    return int(clock) if clock.isdigit() else None


def _espn_matches(sport: str, code: str) -> dict:
    cfg = ESPN_SPORTS[sport]
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=45)).strftime("%Y%m%d")
    end = (now + timedelta(days=45)).strftime("%Y%m%d")
    data = _espn_get(f"{cfg['base']}/{code}/scoreboard?dates={start}-{end}")

    matches = []
    for event in data.get("events", []):
        comp = (event.get("competitions") or [{}])[0]
        status_type = comp.get("status", {}).get("type", {})
        status = ESPN_STATUS_MAP.get(status_type.get("name"), "SCHEDULED")

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

        matches.append({
            "id": event.get("id"),
            "utcDate": event.get("date"),
            "status": status,
            "minute": _espn_minute(comp.get("status", {})) if status == "IN_PLAY" else None,
            "stage": None,
            "group": None,
            "homeTeam": _espn_team(home.get("team", {})),
            "awayTeam": _espn_team(away.get("team", {})),
            "score": {"fullTime": {"home": score(home), "away": score(away)}},
        })

    return {"matches": matches}


def _espn_standings(sport: str, code: str) -> dict:
    cfg = ESPN_SPORTS[sport]
    data = _espn_get(f"{cfg['standings_base']}/{code}/standings")

    groups = []
    for child in data.get("children", []):
        table = []
        for entry in child.get("standings", {}).get("entries", []):
            stats = {s.get("name"): s.get("value") for s in entry.get("stats", [])}
            wins = int(stats.get("wins", 0))
            losses = int(stats.get("losses", 0))
            # Some sports (basketball) don't have a "points" stat that means
            # anything standard — wins is the closest sortable/displayable analog.
            points = wins if sport == "basketball" else int(stats.get("points", 0))
            table.append({
                "position": int(stats.get(cfg["rank_key"], 0)),
                "team": _espn_team(entry.get("team", {})),
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


def _espn_teams(sport: str, code: str) -> dict:
    cfg = ESPN_SPORTS[sport]
    data = _espn_get(f"{cfg['base']}/{code}/teams")
    sports = data.get("sports") or [{}]
    leagues = sports[0].get("leagues") or [{}]
    teams = [_espn_team(t.get("team", {})) for t in leagues[0].get("teams", [])]
    return {"teams": teams}


def _espn_team_detail(sport: str, code: str, team_id) -> dict:
    cfg = ESPN_SPORTS[sport]
    data = _espn_get(f"{cfg['base']}/{code}/teams/{team_id}/roster")
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
            "position": ESPN_POSITION_MAP.get(position, position),
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


# ───────────────────────────── MLB Stats API provider ─────────────────────────────
# Undocumented endpoints that power MLB.com and the MLB app. No auth, no published
# rate limit. Unlike ESPN's soccer scoreboard/standings, the schedule and standings
# responses only embed bare {id, name} team stubs (no crest/abbreviation), so matches
# and standings each need one extra call to /teams to resolve display info.

MLB_STATUS_MAP = {
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

MLB_ABSTRACT_STATUS_MAP = {
    "Preview": "SCHEDULED",
    "Live": "IN_PLAY",
    "Final": "FINISHED",
}

# Postseason gameType codes only — regular season/spring/all-star games get no stage.
MLB_GAME_TYPE_STAGE = {
    "F": "WILD_CARD",
    "D": "DIVISION_SERIES",
    "L": "LEAGUE_CHAMPIONSHIP",
    "W": "WORLD_SERIES",
}


def _mlbstats_get(path: str) -> dict:
    r = requests.get(f"{MLB_STATS_BASE_URL}{path}", timeout=10)
    r.raise_for_status()
    return r.json()


def _mlbstats_team(team_json: dict) -> dict:
    team_id = team_json.get("id")
    return {
        "id": team_id,
        "name": team_json.get("name"),
        "shortName": team_json.get("teamName") or team_json.get("name"),
        "crest": f"{MLB_LOGO_BASE_URL}/{team_id}.svg" if team_id else None,
    }


def _mlbstats_team_lookup(sport_id: str) -> dict:
    data = _mlbstats_get(f"/teams?sportId={sport_id}")
    return {t["id"]: _mlbstats_team(t) for t in data.get("teams", []) if t.get("id")}


def _mlbstats_status(status_json: dict) -> str:
    detailed = status_json.get("detailedState")
    if detailed in MLB_STATUS_MAP:
        return MLB_STATUS_MAP[detailed]
    return MLB_ABSTRACT_STATUS_MAP.get(status_json.get("abstractGameState"), "SCHEDULED")


def _mlbstats_matches(sport_id: str) -> dict:
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=45)).strftime("%Y-%m-%d")
    end = (now + timedelta(days=45)).strftime("%Y-%m-%d")
    data = _mlbstats_get(f"/schedule?sportId={sport_id}&startDate={start}&endDate={end}&hydrate=linescore")
    team_lookup = _mlbstats_team_lookup(sport_id)

    matches = []
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
            matches.append({
                "id": game.get("gamePk"),
                "utcDate": game.get("gameDate"),
                "status": _mlbstats_status(game.get("status", {})),
                "minute": None,
                "stage": MLB_GAME_TYPE_STAGE.get(game.get("gameType")),
                "group": None,
                "homeTeam": resolve_team(home),
                "awayTeam": resolve_team(away),
                "score": {"fullTime": {"home": home.get("score"), "away": away.get("score")}},
            })

    return {"matches": matches}


def _mlbstats_standings(sport_id: str) -> dict:
    year = datetime.now(timezone.utc).year
    data = _mlbstats_get(f"/standings?leagueId=103,104&season={year}&hydrate=division")
    team_lookup = _mlbstats_team_lookup(sport_id)

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


def _mlbstats_teams(sport_id: str) -> dict:
    data = _mlbstats_get(f"/teams?sportId={sport_id}")
    return {"teams": [_mlbstats_team(t) for t in data.get("teams", [])]}


def _mlbstats_team_detail(sport_id: str, team_id) -> dict:
    data = _mlbstats_get(f"/teams/{team_id}/roster")
    squad = []
    for entry in data.get("roster", []):
        person = entry.get("person", {})
        squad.append({
            "id": person.get("id"),
            "name": person.get("fullName"),
            "position": (entry.get("position") or {}).get("type"),
        })
    return {"coach": None, "squad": squad}


# ────────────────────────────────── dispatch ──────────────────────────────────

def _league_config(league: str) -> dict:
    config = LEAGUES.get(league)
    if not config:
        raise ValueError(f"Unknown league: {league}")
    return config


def _fetch_matches(league: str) -> dict:
    config = _league_config(league)
    if config["provider"] == "espn":
        return _espn_matches(config["sport"], config["code"])
    if config["provider"] == "mlbstats":
        return _mlbstats_matches(config["code"])
    return _fd_matches(config["code"])


def _fetch_standings(league: str) -> dict:
    config = _league_config(league)
    if config["provider"] == "espn":
        return _espn_standings(config["sport"], config["code"])
    if config["provider"] == "mlbstats":
        return _mlbstats_standings(config["code"])
    return _fd_standings(config["code"])


def _fetch_teams(league: str) -> dict:
    config = _league_config(league)
    if config["provider"] == "espn":
        return _espn_teams(config["sport"], config["code"])
    if config["provider"] == "mlbstats":
        return _mlbstats_teams(config["code"])
    return _fd_teams(config["code"])


def _fetch_team_detail(league: str, team_id) -> dict:
    config = _league_config(league)
    if config["provider"] == "espn":
        return _espn_team_detail(config["sport"], config["code"], team_id)
    if config["provider"] == "mlbstats":
        return _mlbstats_team_detail(config["code"], team_id)
    return _fd_team_detail(config["code"], team_id)


def _has_live_matches(data: dict) -> bool:
    return any(
        m.get("status") in ("IN_PLAY", "PAUSED")
        for m in data.get("matches", [])
    )


def cached(key: str, fetch):
    now = datetime.now(timezone.utc)
    entry = _cache.get(key)
    live = key.startswith("matches_") and entry and _has_live_matches(entry["data"])
    ttl = CACHE_TTL_LIVE if live else CACHE_TTL_DEFAULT
    if entry and now - entry["ts"] < ttl:
        return entry["data"]
    data = fetch()
    _cache[key] = {"data": data, "ts": now}
    return data


@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/api/<league>/matches")
def matches(league):
    if league not in LEAGUES:
        return jsonify({"error": "Unknown league"}), 404
    data = cached(f"matches_{league}", lambda: _fetch_matches(league))
    return jsonify(data)


@app.route("/api/<league>/standings")
def standings(league):
    if league not in LEAGUES:
        return jsonify({"error": "Unknown league"}), 404
    data = cached(f"standings_{league}", lambda: _fetch_standings(league))
    return jsonify(data)


@app.route("/api/<league>/teams")
def teams(league):
    if league not in LEAGUES:
        return jsonify({"error": "Unknown league"}), 404
    data = cached(f"teams_{league}", lambda: _fetch_teams(league))
    return jsonify(data)


@app.route("/api/<league>/teams/<team_id>")
def team_detail(league, team_id):
    if league not in LEAGUES:
        return jsonify({"error": "Unknown league"}), 404
    data = cached(f"team_{league}_{team_id}", lambda: _fetch_team_detail(league, team_id))
    return jsonify(data)


@app.route("/api/status")
def status():
    now = datetime.now(timezone.utc)
    info = {}
    for key, entry in _cache.items():
        live = key.startswith("matches_") and _has_live_matches(entry["data"])
        ttl = CACHE_TTL_LIVE if live else CACHE_TTL_DEFAULT
        last = entry["ts"]
        next_refresh = last + ttl
        info[key] = {
            "last_updated": last.isoformat(),
            "next_update": next_refresh.isoformat(),
            "stale": now > next_refresh,
            "live_mode": live,
        }
    return jsonify({"cache": info, "api_key_configured": bool(API_KEY)})


@app.route("/api/refresh", methods=["POST"])
@limiter.limit("5 per minute")
def refresh():
    token = request.headers.get("X-Refresh-Token", "")
    if not REFRESH_SECRET or token != REFRESH_SECRET:
        return jsonify({"error": "Unauthorized"}), 401
    _cache.clear()
    return jsonify({"message": "Cache cleared. Next request will fetch fresh data."})


@app.route("/api/analytics/visit", methods=["POST"])
@limiter.limit("10 per minute")
def analytics_visit():
    if not _redis:
        return jsonify({"ok": True})
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        ip = get_remote_address() or "unknown"
        visitor_hash = hashlib.sha256(f"{ip}:{today}".encode()).hexdigest()[:16]
        ttl = 90 * 24 * 3600  # 90 days

        pipe = _redis.pipeline()
        pipe.incr("wcd:total_visits")
        pipe.incr(f"wcd:daily:{today}:visits")
        pipe.sadd(f"wcd:daily:{today}:unique", visitor_hash)
        pipe.expire(f"wcd:daily:{today}:visits", ttl)
        pipe.expire(f"wcd:daily:{today}:unique", ttl)
        pipe.exec()
    except Exception:
        pass
    return jsonify({"ok": True})


@app.route("/api/analytics")
def analytics():
    token = request.headers.get("X-Refresh-Token", "")
    if not REFRESH_SECRET or token != REFRESH_SECRET:
        return jsonify({"error": "Unauthorized"}), 401
    if not _redis:
        return jsonify({"error": "Analytics not configured"}), 503

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    date_keys = [
        (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        for i in range(6, -1, -1)
    ]

    pipe = _redis.pipeline()
    for d in date_keys:
        pipe.get(f"wcd:daily:{d}:visits")
        pipe.scard(f"wcd:daily:{d}:unique")
    pipe.get("wcd:total_visits")
    results = pipe.exec()

    days = []
    for i, d in enumerate(date_keys):
        days.append({
            "date": d,
            "visits": int(results[i * 2] or 0),
            "unique_visitors": int(results[i * 2 + 1] or 0),
        })

    today_data = next((x for x in days if x["date"] == today), {"visits": 0, "unique_visitors": 0})
    return jsonify({
        "total_visits": int(results[-1] or 0),
        "today_visits": today_data["visits"],
        "today_unique_visitors": today_data["unique_visitors"],
        "last_7_days": days,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5001)
