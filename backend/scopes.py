"""Shared definition of the `?range=` slices of a league's match window.

Dashboards load a league in stages — today first, then the next two days,
then everything else (the rest of the future, and the past) — so the first
paint doesn't wait on the full window. Every provider narrows its upstream
request(s) with the same day offsets (relative to today, UTC), computed here
so the scope names mean the same thing everywhere.

"future" (= soon + later) predates the staged loading and is kept so an
already-loaded frontend bundle keeps working.
"""

VALID_RANGES = {"today", "soon", "later", "past", "future"}

SOON_DAYS = 2  # "soon" is days +1..+2


def day_bounds(scope: str, past: int, future: int) -> tuple[int, int]:
    """Inclusive (first_offset, last_offset) in days from today for `scope`,
    given how far back (`past`) and ahead (`future`) the provider's full
    window reaches. "all" is the whole window."""
    if scope == "today":
        return 0, 0
    if scope == "soon":
        return 1, min(SOON_DAYS, future)
    if scope == "later":
        return SOON_DAYS + 1, future
    if scope == "past":
        return -past, -1
    if scope == "future":
        return 1, future
    return -past, future
