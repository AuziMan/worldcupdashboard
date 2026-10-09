import { useState, useEffect, useCallback } from 'react'
import { SPORTS } from '@/lib/sports'
import { adaptStandardMatch, adaptUfcFight, adaptF1Session } from '@/lib/liveFeed'

const POLL_INTERVAL = 60 * 1000 // 60 seconds
const ACTIVE_START_HOUR = 9
const ACTIVE_END_HOUR = 21

function isActiveHour() {
  const hour = new Date().getHours()
  return hour >= ACTIVE_START_HOUR && hour < ACTIVE_END_HOUR
}

// Standard-shape leagues (football_data.org / ESPN / MLB Stats API all
// normalize to the same homeTeam/awayTeam/score/minute/period shape) mapped
// to the homepage sport tile they belong under. `wc` is deliberately
// excluded — dormant until WC 2030 fixtures exist, nothing to show.
const STANDARD_LEAGUES = [
  { league: 'epl', sportKey: 'soccer' },
  { league: 'mls', sportKey: 'soccer' },
  { league: 'mlb', sportKey: 'mlb' },
  { league: 'nba', sportKey: 'nba' },
  { league: 'nfl', sportKey: 'nfl' },
  { league: 'ncaaf', sportKey: 'ncaaf' },
]

const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return res.json()
}

function emptyGamesBySport() {
  const bySport = {}
  Object.keys(SPORTS).forEach(key => { bySport[key] = [] })
  return bySport
}

// Fans out across all 7 sport tiles at once (8 league calls — one provider
// outage must not blank out the other sports' ticker lines, hence
// Promise.allSettled rather than Promise.all), and normalizes every result
// into the common Game shape from lib/liveFeed.js.
export function useLiveFeed() {
  const [games, setGames] = useState([])
  const [gamesBySport, setGamesBySport] = useState(emptyGamesBySport)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const results = await Promise.allSettled([
        ...STANDARD_LEAGUES.map(({ league }) => fetchJSON(`/api/${league}/matches`)),
        fetchJSON('/api/ufc/matches'),
        fetchJSON('/api/f1/matches'),
      ])

      const nextGames = []

      STANDARD_LEAGUES.forEach(({ league, sportKey }, i) => {
        const result = results[i]
        if (result.status !== 'fulfilled') {
          console.warn(`useLiveFeed: ${league} matches failed`, result.reason)
          return
        }
        result.value.matches.forEach(m => nextGames.push(adaptStandardMatch(m, sportKey, league)))
      })

      const ufcResult = results[STANDARD_LEAGUES.length]
      if (ufcResult.status === 'fulfilled') {
        ufcResult.value.matches.forEach(f => nextGames.push(adaptUfcFight(f)))
      } else {
        console.warn('useLiveFeed: ufc matches failed', ufcResult.reason)
      }

      const f1Result = results[STANDARD_LEAGUES.length + 1]
      if (f1Result.status === 'fulfilled') {
        f1Result.value.matches.forEach(s => nextGames.push(adaptF1Session(s)))
      } else {
        console.warn('useLiveFeed: f1 matches failed', f1Result.reason)
      }

      const nextGamesBySport = emptyGamesBySport()
      nextGames.forEach(g => { nextGamesBySport[g.sportKey]?.push(g) })

      setGames(nextGames)
      setGamesBySport(nextGamesBySport)
      setLastFetched(new Date())
      setError(results.every(r => r.status === 'rejected') ? 'Live data unavailable' : null)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(true)
  }, [load])

  useEffect(() => {
    const interval = setInterval(() => {
      if (isActiveHour()) load(false)
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [load])

  return { games, gamesBySport, loading, error, lastFetched, refresh: () => load(true) }
}
