"""ESPN UFC provider — same undocumented site.api.espn.com family as
providers/espn.py, but MMA's event -> fight fan-out (many fights per fight-
night event) and rankings-instead-of-standings shape don't fit
espn.matches()/espn.standings(), so this gets its own small provider rather
than a third sport family bolted onto ESPN_SPORTS. Fights are flattened
one-per-entry (not one-per-event) into the "matches" key so the existing
cache/live-detection machinery (cache._has_live_matches, cache.cached())
keeps working unmodified. ESPN doesn't expose a dedicated method-of-victory
field — it's scraped out of the play-by-play "details" list (see _method()).
"""

from datetime import datetime, timedelta, timezone

import requests

from providers.espn import STATUS_MAP

ESPN_UFC_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc"
ESPN_UFC_HEADSHOT_BASE_URL = "https://a.espncdn.com/i/headshots/mma/players/full"

METHOD_LABELS = {
    "decision": "Decision",
    "submission": "Submission",
    "kotko": "KO/TKO",
}


def _get(path: str) -> dict:
    r = requests.get(f"{ESPN_UFC_BASE_URL}{path}", timeout=10)
    r.raise_for_status()
    return r.json()


def _headshot(athlete: dict, athlete_id) -> str | None:
    # ESPN is inconsistent here: /rankings gives a bare URL string, other feeds
    # give a {"href": ...} object, and /scoreboard usually omits the field
    # entirely. Fall back to ESPN's own predictable headshot CDN path (same
    # one those explicit URLs point at) keyed by athlete id, so scoreboard
    # fighters get a photo too, not just ranked ones. `athlete_id` is passed
    # in separately because /scoreboard's athlete object has no "id" of its
    # own — the id lives one level up, on the competitor.
    headshot = athlete.get("headshot")
    if isinstance(headshot, dict):
        return headshot.get("href")
    if isinstance(headshot, str) and headshot:
        return headshot
    return f"{ESPN_UFC_HEADSHOT_BASE_URL}/{athlete_id}.png" if athlete_id else None


def _fighter(competitor: dict) -> dict:
    athlete = competitor.get("athlete", {})
    athlete_id = athlete.get("id") or competitor.get("id")
    return {
        "id": athlete_id,
        "name": athlete.get("displayName"),
        "shortName": athlete.get("shortName"),
        "photo": _headshot(athlete, athlete_id),
        "record": (competitor.get("records") or [{}])[0].get("summary"),
    }


def _method(details: list) -> str | None:
    # Entries look like {"type": {"text": "Unofficial Winner Decision"}} —
    # "Unofficial Winner Kotko" is ESPN's own (mis-cased) shorthand for KO/TKO.
    for detail in details or []:
        text = (detail.get("type") or {}).get("text", "")
        if text.startswith("Unofficial Winner "):
            method = text.removeprefix("Unofficial Winner ").strip().lower()
            return METHOD_LABELS.get(method, method.title())
    return None


def _division_label(rtype: str) -> str:
    return " ".join("Women's" if w == "womens" else w.capitalize() for w in rtype.split("-"))


def matches() -> dict:
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=45)).strftime("%Y%m%d")
    end = (now + timedelta(days=180)).strftime("%Y%m%d")
    data = _get(f"/scoreboard?dates={start}-{end}")

    results = []
    for event in data.get("events", []):
        for comp in event.get("competitions", []):
            status_type = comp.get("status", {}).get("type", {})
            status = STATUS_MAP.get(status_type.get("name"), "SCHEDULED")

            competitors = sorted(comp.get("competitors", []), key=lambda c: c.get("order", 0))
            fighter1 = competitors[0] if len(competitors) > 0 else {}
            fighter2 = competitors[1] if len(competitors) > 1 else {}

            winner = next((c for c in competitors if c.get("winner")), None)
            result = None
            if status == "FINISHED" and winner:
                result = {
                    "winnerId": (winner.get("athlete") or {}).get("id") or winner.get("id"),
                    "round": comp.get("status", {}).get("period"),
                    "method": _method(comp.get("details")),
                }

            results.append({
                "id": comp.get("id"),
                "event": event.get("name"),
                "utcDate": comp.get("date") or event.get("date"),
                "status": status,
                "weightClass": (comp.get("type") or {}).get("abbreviation"),
                "fighter1": _fighter(fighter1),
                "fighter2": _fighter(fighter2),
                "result": result,
            })

    return {"matches": results}


def standings() -> dict:
    data = _get("/rankings")

    groups = []
    for group in data.get("rankings", []):
        # Skip pound-for-pound (cross-division, not a weight class) and the
        # single-entry "champions" lists — the numbered division lists already
        # carry the champion at rank 1.
        rtype = group.get("type", "")
        if "pound-for-pound" in rtype or rtype.endswith("-champions"):
            continue

        table = []
        for rank in group.get("ranks", []):
            athlete = rank.get("athlete", {})
            table.append({
                "position": rank.get("current"),
                "fighter": {
                    "id": athlete.get("id"),
                    "name": athlete.get("displayName"),
                    "shortName": athlete.get("shortname"),
                    "photo": _headshot(athlete, athlete.get("id")),
                },
                "record": rank.get("recordSummary"),
            })
        table.sort(key=lambda row: row["position"] or 0)
        groups.append({"group": _division_label(rtype), "table": table})

    return {"standings": groups}
