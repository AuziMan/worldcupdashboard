import { useState, useEffect, useCallback } from 'react'

// The dashboard is fully static: data is pre-fetched by a GitHub Action and
// published as JSON files alongside the build. We poll those files so a user
// with the page open picks up a fresh deploy without a manual reload.
const POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes

// import.meta.env.BASE_URL is "/" locally and "/<repo>/" on GitHub Pages.
const BASE = import.meta.env.BASE_URL

async function fetchJSON(name) {
  // Cache-bust so the CDN doesn't hand back a stale copy after a redeploy.
  const url = `${BASE}data/${name}.json?t=${Date.now()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${name}.json returned ${res.status}`)
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
        fetchJSON('matches'),
        fetchJSON('standings'),
        // status.json is informational; don't fail the whole load if it's absent.
        fetchJSON('status').catch(() => null),
      ])
      setMatches(matchData)
      setStandings(standingData)
      setStatus(statusData)
      // Prefer the data's own generation time over the client fetch time.
      setLastFetched(
        statusData?.generated_at ? new Date(statusData.generated_at) : new Date()
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [load])

  return { matches, standings, status, loading, error, lastFetched, refresh: load }
}
