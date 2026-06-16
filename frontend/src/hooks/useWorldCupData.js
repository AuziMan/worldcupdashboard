import { useState, useEffect, useCallback } from 'react'

const REFRESH_INTERVAL = 3 * 60 * 60 * 1000 // 3 hours
const ACTIVE_START_HOUR = 9   // 9 AM
const ACTIVE_END_HOUR = 21    // 9 PM

function isActiveHour() {
  const hour = new Date().getHours()
  return hour >= ACTIVE_START_HOUR && hour < ACTIVE_END_HOUR
}

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} returned ${res.status}`)
  return res.json()
}

export function useWorldCupData() {
  const [matches, setMatches] = useState(null)
  const [standings, setStandings] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    const interval = setInterval(() => {
      if (isActiveHour()) {
        load()
      }
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [load])

  return { matches, standings, status, loading, error, lastFetched, refresh: load }
}
