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
    m => m.status === 'IN_PLAY' || m.status === 'PAUSED'
  ) ?? false
}

const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return res.json()
}

export function useWorldCupData() {
  const [matches, setMatches] = useState(null)
  const [standings, setStandings] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const [isLiveMode, setIsLiveMode] = useState(false)
  const intervalRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [matchData, standingData, statusData] = await Promise.all([
        fetchJSON('/api/matches'),
        fetchJSON('/api/standings'),
        fetchJSON('/api/status'),
      ])
      setMatches(matchData)
      setStandings(standingData)
      setStatus(statusData)
      setLastFetched(new Date())
      setIsLiveMode(hasLiveMatches(matchData))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Restart interval whenever live mode changes so cadence updates immediately
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const interval = isLiveMode ? INTERVAL_LIVE : INTERVAL_DEFAULT
    intervalRef.current = setInterval(() => {
      if (isActiveHour()) load()
    }, interval)
    return () => clearInterval(intervalRef.current)
  }, [isLiveMode, load])

  useEffect(() => {
    load()
  }, [load])

  return { matches, standings, status, loading, error, lastFetched, isLiveMode, refresh: load }
}
