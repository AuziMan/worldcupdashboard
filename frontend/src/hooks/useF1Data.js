import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { loadMatchesStaged, upsertMatches, FULL_STAGES, POLL_STAGES } from '@/lib/stagedMatches'

const INTERVAL_DEFAULT = 60 * 1000
const INTERVAL_LIVE = 60 * 1000
const ACTIVE_START_HOUR = 9
const ACTIVE_END_HOUR = 21

function isActiveHour() {
  const hour = new Date().getHours()
  return hour >= ACTIVE_START_HOUR && hour < ACTIVE_END_HOUR
}

function hasLiveSessions(matchData) {
  return matchData?.matches?.some(m => m.status === 'IN_PLAY') ?? false
}

// Preserve JS reference identity for sessions whose status hasn't changed,
// so React.memo on SessionCard can skip re-renders.
function mergeSessions(prev, next) {
  if (!prev?.matches) return next
  const prevById = new Map(prev.matches.map(m => [m.id, m]))
  let changed = false
  const merged = next.matches.map(m => {
    const old = prevById.get(m.id)
    if (old && old.status === m.status) return old
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

export function useF1Data() {
  const [matches, setMatches] = useState(null)
  const [standings, setStandings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const intervalRef = useRef(null)
  const inFlightRef = useRef(false)
  // False until a load has fetched every stage; polls only refresh
  // today/soon, so an incomplete load is retried in full on the next poll.
  const fullyLoadedRef = useRef(false)

  const load = useCallback(async (showLoading = false) => {
    if (inFlightRef.current && !showLoading) return
    inFlightRef.current = true
    if (showLoading) setLoading(true)
    setError(null)

    // Standings land independently so they never hold up the first paint of
    // today's games.
    fetchJSON('/api/f1/standings')
      .then(setStandings)
      .catch(err => setError(err.message))

    try {
      const full = showLoading || !fullyLoadedRef.current
      const complete = await loadMatchesStaged(
        fetchJSON,
        'f1',
        data => {
          setMatches(prev => mergeSessions(prev, upsertMatches(prev, data)))
          setLastFetched(new Date())
          setLoading(false)
        },
        full ? FULL_STAGES : POLL_STAGES
      )
      if (full) fullyLoadedRef.current = complete
    } catch (err) {
      setError(err.message)
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [])

  const isLiveMode = useMemo(() => hasLiveSessions(matches), [matches])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const interval = isLiveMode ? INTERVAL_LIVE : INTERVAL_DEFAULT
    intervalRef.current = setInterval(() => {
      if (isActiveHour()) load(false)
    }, interval)
    return () => clearInterval(intervalRef.current)
  }, [isLiveMode, load])

  useEffect(() => {
    load(true)
  }, [load])

  return { matches, standings, loading, error, lastFetched, isLiveMode, refresh: () => load(true) }
}
