#!/usr/bin/env python3
"""Fetch World Cup data from football-data.org and write static JSON files.

This replaces the old Flask proxy backend. It is meant to run in CI (GitHub
Actions) on a schedule, with the API key supplied via the FOOTBALL_DATA_API_KEY
environment variable / GitHub Secret. The key never reaches the browser — only
the resulting JSON files are published to GitHub Pages.

It can also be run locally for development:

    FOOTBALL_DATA_API_KEY=xxxx python3 scripts/fetch_data.py

Output is written to frontend/public/data/ so Vite copies it into the build.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

try:
    # Optional: lets local runs read scripts/.env. Not needed in CI.
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "").strip()
BASE_URL = "https://api.football-data.org/v4"
COMPETITION = "WC"

# Where the static JSON lands. Vite copies frontend/public/* into the build root,
# so these end up served at <base>/data/<file>.json on GitHub Pages.
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data"

# Each entry: output filename -> API path. Add/remove endpoints here.
ENDPOINTS = {
    "matches": f"/competitions/{COMPETITION}/matches",
    "standings": f"/competitions/{COMPETITION}/standings",
}


def fetch(path: str) -> dict:
    resp = requests.get(
        f"{BASE_URL}{path}",
        headers={"X-Auth-Token": API_KEY},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def main() -> int:
    if not API_KEY:
        print(
            "ERROR: FOOTBALL_DATA_API_KEY is not set. "
            "Set it in the environment (CI: GitHub Secret; local: scripts/.env).",
            file=sys.stderr,
        )
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    status = {"generated_at": now.isoformat(), "sources": {}}

    failures = 0
    for name, path in ENDPOINTS.items():
        try:
            data = fetch(path)
            (OUTPUT_DIR / f"{name}.json").write_text(
                json.dumps(data, separators=(",", ":")), encoding="utf-8"
            )
            status["sources"][name] = {"ok": True}
            print(f"[OK] wrote {name}.json")
        except Exception as exc:  # noqa: BLE001 - want to keep going per endpoint
            failures += 1
            status["sources"][name] = {"ok": False, "error": str(exc)}
            print(f"[FAIL] {name}: {exc}", file=sys.stderr)

    (OUTPUT_DIR / "status.json").write_text(
        json.dumps(status, separators=(",", ":")), encoding="utf-8"
    )
    print(f"[OK] wrote status.json (generated_at={status['generated_at']})")

    # Fail the job only if everything failed, so a single flaky endpoint doesn't
    # block a deploy that still has usable data.
    if failures == len(ENDPOINTS):
        print("ERROR: all endpoints failed.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
