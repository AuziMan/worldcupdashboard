"""ESPN F1 provider — now scoped to just standings(). Race weekend schedule,
sessions, and driver/position data moved to providers/openf1.py, which is
purpose-built for near-real-time F1 data (practice/qualifying/sprint/race,
not just the race, with live position polling) in a way ESPN's feed wasn't:
ESPN's F1 "statistics" field was consistently empty (no gap/lap-time data),
and its scoreboard only exposed the final Race session, not the full
weekend.

Championship standings are the one thing OpenF1 doesn't have — it only
exposes per-session results, not a cumulative points table — so this stays
on ESPN's site.api.espn.com/apis/v2/sports/racing/f1/standings, which does:
children[0] is Driver standings, children[1] is Constructor standings, both
with athlete/team objects fully embedded (same "standings_base" shape
providers/espn.py already parses for soccer/NBA/NFL, just a different host
path).
"""

import requests

ESPN_F1_STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/racing/f1/standings"


def _get(url: str) -> dict:
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()


def _points(stats: dict) -> int:
    raw = stats.get("championshipPts", stats.get("points", 0))
    try:
        return int(float(raw))
    except (TypeError, ValueError):
        return 0


def standings() -> dict:
    data = _get(ESPN_F1_STANDINGS_URL)

    groups = []
    for child in data.get("children", []):
        table = []
        for entry in (child.get("standings") or {}).get("entries", []):
            stats = {s.get("name"): s.get("value") for s in entry.get("stats", [])}
            row = {
                "position": int(stats.get("rank") or 0),
                "points": _points(stats),
            }
            if "athlete" in entry:
                athlete = entry["athlete"]
                row["driver"] = {
                    "id": athlete.get("id"),
                    "name": athlete.get("displayName"),
                    "shortName": athlete.get("shortName"),
                    "flag": (athlete.get("flag") or {}).get("href"),
                    "photo": f"https://a.espncdn.com/i/headshots/f1/players/full/{athlete.get('id')}.png" if athlete.get("id") else None,
                }
            elif "team" in entry:
                team = entry["team"]
                row["team"] = {
                    "id": team.get("id"),
                    "name": team.get("displayName"),
                    "shortName": team.get("shortDisplayName"),
                    "color": team.get("color"),
                }
            table.append(row)
        table.sort(key=lambda row: row["position"])
        groups.append({"group": child.get("name"), "table": table})

    return {"standings": groups}
