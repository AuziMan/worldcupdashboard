import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { loadMatchesStaged, upsertMatches, FULL_STAGES, POLL_STAGES } from '@/lib/stagedMatches'

const INTERVAL_DEFAULT = 60 * 1000  // 60 seconds
const INTERVAL_LIVE = 60 * 1000    // 60 seconds during live games
const ACTIVE_START_HOUR = 9
const ACTIVE_END_HOUR = 21

function isActiveHour() {
  const hour = new Date().getHours()
  return hour >= ACTIVE_START_HOUR && hour < ACTIVE_END_HOUR
}

function hasLiveMatches(matchData) {
  return matchData?.matches?.some(
    m => m.status === 'IN_PLAY' || m.status === 'LIVE' || m.status === 'PAUSED'
  ) ?? false
}

// Preserve JS reference identity for matches whose live-relevant fields haven't
// changed, so React.memo on MatchCard can skip re-renders for non-live cards.
function mergeMatches(prev, next) {
  if (!prev?.matches) return next
  const prevById = new Map(prev.matches.map(m => [m.id, m]))
  let changed = false
  const merged = next.matches.map(m => {
    const old = prevById.get(m.id)
    if (
      old &&
      old.status === m.status &&
      old.score?.fullTime?.home === m.score?.fullTime?.home &&
      old.score?.fullTime?.away === m.score?.fullTime?.away &&
      old.score?.halfTime?.home === m.score?.halfTime?.home &&
      old.score?.halfTime?.away === m.score?.halfTime?.away &&
      old.minute === m.minute
    ) {
      return old
    }
    changed = true
    return m
  })
  if (!changed) return prev
  return { ...next, matches: merged }
}

const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return res.json()
}

export function useLeagueData(league) {
  const [matches, setMatches] = useState(null)
  const [standings, setStandings] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const intervalRef = useRef(null)
  // Bumped on every league switch so a staged load for the old league that's
  // still in flight can't write into the new league's state.
  const epochRef = useRef(0)
  const inFlightRef = useRef(false)
  // False until a load has fetched every stage; polls only refresh
  // today/soon, so an incomplete load is retried in full on the next poll.
  const fullyLoadedRef = useRef(false)

  const load = useCallback(async (showLoading = false) => {
    if (inFlightRef.current && !showLoading) return
    const epoch = epochRef.current
    const isCurrent = () => epoch === epochRef.current
    inFlightRef.current = true
    if (showLoading) setLoading(true)
    setError(null)

    // Standings/status are independent of matches: they land whenever they
    // land instead of holding up the first paint of today's games.
    Promise.all([fetchJSON(`/api/${league}/standings`), fetchJSON('/api/status')])
      .then(([standingData, statusData]) => {
        if (!isCurrent()) return
        setStandings(standingData)
        setStatus(statusData)
      })
      .catch(err => { if (isCurrent()) setError(err.message) })

    try {
      const full = showLoading || !fullyLoadedRef.current
      const complete = await loadMatchesStaged(
        fetchJSON,
        league,
        data => {
          if (!isCurrent()) return
          setMatches(prev => mergeMatches(prev, upsertMatches(prev, data)))
          setLastFetched(new Date())
          setLoading(false)
        },
        full ? FULL_STAGES : POLL_STAGES
      )
      if (full && isCurrent()) fullyLoadedRef.current = complete
    } catch (err) {
      if (isCurrent()) setError(err.message)
    } finally {
      if (isCurrent()) {
        inFlightRef.current = false
        setLoading(false)
      }
    }
  }, [league])

  const isLiveMode = useMemo(() => hasLiveMatches(matches), [matches])

  // Restart interval whenever live mode changes so cadence updates immediately
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const interval = isLiveMode ? INTERVAL_LIVE : INTERVAL_DEFAULT
    intervalRef.current = setInterval(() => {
      if (isActiveHour()) load(false)
    }, interval)
    return () => clearInterval(intervalRef.current)
  }, [isLiveMode, load])

  // Switching leagues: drop stale data and refetch with the loading spinner
  useEffect(() => {
    epochRef.current += 1
    inFlightRef.current = false
    fullyLoadedRef.current = false
    setMatches(null)
    setStandings(null)
    load(true)
  }, [league, load])

  return { matches, standings, status, loading, error, lastFetched, isLiveMode, refresh: () => load(true) }
}
