"""OpenF1 provider (api.openf1.org) — F1's near-real-time data source: every
session of a race weekend (practice, qualifying, sprint, race — not just the
race), driver rosters, and live/final classification. Free, no auth, and
—unlike every other provider in this app— actually built for real-time
polling: position data updates every few seconds during a live session. That
means session_detail() is deliberately NOT run through cache.py's shared
60s TTL (see routes/f1.py) — a stale cache would defeat the point of using it.

Two ESPN-style "one big call" endpoints cover almost everything:
  - GET /meetings?year=<Y> — one row per Grand Prix weekend (+ pre-season
    testing, filtered out below — it isn't a championship race weekend).
  - GET /sessions?year=<Y> — one row per session across the whole season
    (Practice 1/2/3, Sprint Qualifying, Sprint, Qualifying, Race). Joining
    these two in Python (by meeting_key) builds the full season schedule in
    exactly two upstream calls — no per-meeting fan-out needed.
Per-session detail (driver roster + results) is fetched lazily, only for
the one session a user actually opens (session_detail()), the same
on-demand pattern this app already uses for team squads/rosters elsewhere:
  - GET /drivers?session_key=<K> — that session's entry list, with team
    name/colour and a headshot URL already embedded (no CDN-guessing needed,
    unlike ESPN's F1 feed).
  - GET /session_result?session_key=<K> — official classification once one
    exists (position, points, gap_to_leader, dnf/dns/dsq). 404s (returned as
    an empty list by _get(), not an error) until the session is final.
  - GET /position?session_key=<K> — full position-change history for the
    session; while a session is live (no session_result yet) this is reduced
    to each driver's single latest row, i.e. the current running order.

Championship standings (cumulative points across the season) are NOT
covered here — OpenF1 has no such endpoint, only per-session results — so
providers/f1.py still serves standings() from ESPN, which does have one.
This provider only owns the schedule/session/live-position side.
"""

from datetime import datetime, timezone

import requests

OPENF1_BASE_URL = "https://api.openf1.org/v1"


def _get(path: str, **params):
    r = requests.get(f"{OPENF1_BASE_URL}{path}", params=params, timeout=10)
    if r.status_code == 404:
        # OpenF1 404s (with a {"detail": "No results found."} body) instead
        # of returning an empty list for a session with no data yet — e.g.
        # session_result/position for a session that hasn't started.
        return []
    r.raise_for_status()
    return r.json()


def _status(session: dict) -> str:
    if session.get("is_cancelled"):
        return "CANCELLED"
    now = datetime.now(timezone.utc)
    start = datetime.fromisoformat(session["date_start"])
    end_raw = session.get("date_end")
    end = datetime.fromisoformat(end_raw) if end_raw else None
    if now < start:
        return "SCHEDULED"
    if end and now > end:
        return "FINISHED"
    return "IN_PLAY"


def matches() -> dict:
    year = datetime.now(timezone.utc).year
    meetings = _get("/meetings", year=year)
    meetings_by_key = {
        m["meeting_key"]: m for m in meetings
        if "Testing" not in (m.get("meeting_name") or "")
    }
    sessions = _get("/sessions", year=year)

    results = []
    for s in sessions:
        meeting = meetings_by_key.get(s.get("meeting_key"))
        if not meeting:
            continue
        results.append({
            "id": s["session_key"],
            "meetingKey": meeting["meeting_key"],
            "meetingName": meeting.get("meeting_name"),
            "location": meeting.get("location"),
            "country": meeting.get("country_name"),
            "countryFlag": meeting.get("country_flag"),
            "circuitImage": meeting.get("circuit_image"),
            "session": s.get("session_name"),
            "sessionType": s.get("session_type"),
            "utcDate": s.get("date_start"),
            "endDate": s.get("date_end"),
            "status": _status(s),
        })

    results.sort(key=lambda m: m["utcDate"] or "")
    return {"matches": results}


def _driver_lookup(session_key) -> dict:
    drivers = _get("/drivers", session_key=session_key)
    return {
        d["driver_number"]: {
            "number": d.get("driver_number"),
            "name": d.get("full_name"),
            "shortName": d.get("name_acronym"),
            "team": d.get("team_name"),
            "teamColor": d.get("team_colour"),
            "photo": d.get("headshot_url"),
        }
        for d in drivers
    }


def _latest_positions(session_key) -> list:
    rows = _get("/position", session_key=session_key)
    latest = {}
    for row in rows:
        num = row.get("driver_number")
        if num not in latest or row.get("date", "") > latest[num].get("date", ""):
            latest[num] = row
    return sorted(latest.values(), key=lambda r: r.get("position") or 999)


def session_detail(session_key) -> dict:
    drivers = _driver_lookup(session_key)
    result_rows = _get("/session_result", session_key=session_key)

    if result_rows:
        # Stable sort: DNF/DNS/DSQ rows carry position=None and keep OpenF1's
        # own relative order (already sensible — most-laps-completed first).
        result_rows = sorted(result_rows, key=lambda r: (r.get("position") is None, r.get("position") or 0))
        results = [
            {
                "position": r.get("position"),
                "driver": drivers.get(r.get("driver_number"), {"number": r.get("driver_number")}),
                "points": r.get("points"),
                "gap": r.get("gap_to_leader"),
                "dnf": bool(r.get("dnf")),
                "dns": bool(r.get("dns")),
                "dsq": bool(r.get("dsq")),
            }
            for r in result_rows
        ]
        return {"results": results, "final": True}

    positions = _latest_positions(session_key)
    if positions:
        results = [
            {"position": p.get("position"), "driver": drivers.get(p.get("driver_number"), {"number": p.get("driver_number")})}
            for p in positions
        ]
        return {"results": results, "final": False}

    # Session hasn't started yet (or OpenF1 has nothing for it) — fall back
    # to a plain entry list, ordered by car number, with no position.
    entry_list = [
        {"position": None, "driver": d}
        for d in sorted(drivers.values(), key=lambda d: d.get("number") or 0)
    ]
    return {"results": entry_list, "final": False}
