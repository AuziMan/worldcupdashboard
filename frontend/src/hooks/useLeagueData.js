import { useState, useEffect, useCallback, useRef } from 'react'

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
  const [isLiveMode, setIsLiveMode] = useState(false)
  const intervalRef = useRef(null)

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const [matchData, standingData, statusData] = await Promise.all([
        fetchJSON(`/api/${league}/matches`),
        fetchJSON(`/api/${league}/standings`),
        fetchJSON('/api/status'),
      ])
      setMatches(prev => mergeMatches(prev, matchData))
      setStandings(standingData)
      setStatus(statusData)
      setLastFetched(new Date())
      setIsLiveMode(hasLiveMatches(matchData))
    } catch (err) {
      setError(err.message)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [league])

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
    setMatches(null)
    setStandings(null)
    setIsLiveMode(false)
    load(true)
  }, [league, load])

  return { matches, standings, status, loading, error, lastFetched, isLiveMode, refresh: () => load(true) }
}
