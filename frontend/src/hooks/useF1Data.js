import { useState, useEffect, useCallback, useRef } from 'react'

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
  const [isLiveMode, setIsLiveMode] = useState(false)
  const intervalRef = useRef(null)

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const [matchData, standingData] = await Promise.all([
        fetchJSON('/api/f1/matches'),
        fetchJSON('/api/f1/standings'),
      ])
      setMatches(prev => mergeSessions(prev, matchData))
      setStandings(standingData)
      setLastFetched(new Date())
      setIsLiveMode(hasLiveSessions(matchData))
    } catch (err) {
      setError(err.message)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

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
