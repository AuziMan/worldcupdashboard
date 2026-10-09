export function isLiveStatus(status) {
  return status === 'IN_PLAY' || status === 'LIVE' || status === 'PAUSED'
}

// football-data.org's free tier never reports a live match minute for
// WC/EPL, so this approximates one from wall-clock time since kickoff —
// reasonable only because soccer halves are a fixed ~45 minutes (unlike
// basketball/football, which get a real per-quarter clock instead — see
// providers/espn.py's _quarter_clock()). Frozen at 45' during halftime
// rather than climbing with break time, and offset by a standard ~15-minute
// halftime once the second half is under way, so a match actually at minute
// 60 doesn't read as 75'.
const SOCCER_HALF_MINUTES = 45
const SOCCER_HALFTIME_MINUTES = 15

export function estimateSoccerMinute(kickoff, status) {
  const wallClockMinutes = Math.round((Date.now() - kickoff) / 60000)
  if (status === 'PAUSED') return SOCCER_HALF_MINUTES
  if (wallClockMinutes <= SOCCER_HALF_MINUTES) return wallClockMinutes
  return Math.max(SOCCER_HALF_MINUTES, wallClockMinutes - SOCCER_HALFTIME_MINUTES)
}

// "Starting Soon" cards (kickoff within the next 4 hours, same window
// MatchSection buckets them by) show the actual kickoff time rather than a
// relative countdown — easier to scan at a glance than a ticking "in 12m".
export function formatStartingSoonTime(kickoff) {
  const diff = kickoff - Date.now()
  if (diff <= 0 || diff > 4 * 60 * 60000) return null
  return kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
