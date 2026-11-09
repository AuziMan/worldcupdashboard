#!/usr/bin/env python3
"""Warms the backend's in-memory cache by requesting the same endpoints the
frontend does, so the first visitor after a deploy doesn't sit through the
cold upstream fetches (tens of seconds on Render's free tier).

Runs from OUTSIDE the server on purpose. An in-process boot-time warm-up was
tried and reverted (see CLAUDE.md, "Known limitations"): it ran at full
speed inside the freshly started process and was suspected of crashing the
instance in a loop. This instead goes through the normal request path at low
concurrency, in the order users need things, and a crash can't re-trigger it.

Usage:
    python scripts/warm_cache.py https://your-backend.onrender.com [--commit SHA]

With --commit it first waits until /api/status reports that commit (Render's
RENDER_GIT_COMMIT), i.e. until the new deploy is actually the one serving.
Standard library only, so CI needs no pip install.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

# Leagues the app shows (wc is dormant until WC 2030 fixtures exist).
LEAGUES = ["epl", "mls", "mlb", "nba", "nfl", "ncaaf", "ufc", "f1"]

# What a first visit needs, in order of how soon it's seen: today's games for
# every sport (first paint), then the next two days, then standings (Standings
# tab), then the long tail (the rest of the future, and the past). Each phase
# finishes before the next starts so cheap, urgent data is never queued behind
# a slow fetch like UFC's 178-request "later" slice.
PHASES = [
    ("today", [f"/api/{l}/matches?range=today" for l in LEAGUES]),
    ("soon", [f"/api/{l}/matches?range=soon" for l in LEAGUES]),
    ("standings", [f"/api/{l}/standings" for l in LEAGUES]),
    ("later", [f"/api/{l}/matches?range=later" for l in LEAGUES]),
    ("past", [f"/api/{l}/matches?range=past" for l in LEAGUES]),
]


def fetch(url: str, timeout: float):
    req = urllib.request.Request(url, headers={"User-Agent": "gamefold-cache-warmer"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read()


def wait_for_deploy(base: str, commit: str | None, timeout: float) -> bool:
    deadline = time.monotonic() + timeout
    while True:
        try:
            _, body = fetch(f"{base}/api/status", timeout=30)
            served = json.loads(body).get("commit")
            if commit is None or served == commit:
                print(f"backend is up (commit {served or 'unknown'})")
                return True
            print(f"backend is up but serving {served or 'unknown'}, waiting for {commit[:7]}…")
        except (urllib.error.URLError, TimeoutError, ValueError) as e:
            print(f"backend not reachable yet ({e})")
        if time.monotonic() >= deadline:
            return False
        time.sleep(10)


def warm(base: str, path: str, timeout: float):
    """One warm-up request, retried a couple of times. Returns (path, ok,
    seconds). A 429 (the backend rate-limits per IP, 60/min) waits out its
    Retry-After instead of burning the retries instantly."""
    start = time.monotonic()
    for attempt in range(3):
        try:
            status, _ = fetch(f"{base}{path}", timeout)
            if status == 200:
                return path, True, time.monotonic() - start
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(min(int(e.headers.get("Retry-After") or 20), 60))
                continue
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(2)
    return path, False, time.monotonic() - start


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("base_url", help="backend base URL, e.g. https://x.onrender.com")
    ap.add_argument("--commit", help="wait until the backend reports this git SHA")
    ap.add_argument("--wait-timeout", type=float, default=900, help="seconds to wait for the deploy (default 900)")
    ap.add_argument("--request-timeout", type=float, default=180, help="per-request timeout in seconds")
    ap.add_argument("--concurrency", type=int, default=2, help="simultaneous requests (default 2; the host is tiny)")
    args = ap.parse_args()
    base = args.base_url.rstrip("/")

    if not wait_for_deploy(base, args.commit, args.wait_timeout):
        print("deploy never became live in time; nothing warmed", file=sys.stderr)
        return 1

    total = failed = 0
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        for name, paths in PHASES:
            phase_start = time.monotonic()
            results = list(pool.map(lambda p: warm(base, p, args.request_timeout), paths))
            bad = [p for p, ok, _ in results if not ok]
            total += len(results)
            failed += len(bad)
            slowest = max(secs for _, _, secs in results)
            print(f"{name:<10} {len(results) - len(bad)}/{len(results)} ok  "
                  f"{time.monotonic() - phase_start:5.1f}s (slowest {slowest:.1f}s)")
            for p in bad:
                print(f"  FAILED {p}", file=sys.stderr)

    print(f"warmed {total - failed}/{total} endpoints in {time.monotonic() - started:.0f}s")
    # A few failures aren't a failed deploy (upstreams flake); only fail when
    # nothing worked, which means the warm-up itself was broken.
    return 1 if failed == total else 0


if __name__ == "__main__":
    sys.exit(main())
