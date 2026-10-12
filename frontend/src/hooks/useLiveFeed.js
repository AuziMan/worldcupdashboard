import { useState, useEffect, useCallback, useMemo } from 'react'
import { SPORTS } from '@/lib/sports'
import { adaptStandardMatch, adaptUfcFight, adaptF1Session } from '@/lib/liveFeed'

const POLL_INTERVAL = 60 * 1000 // 60 seconds
const ACTIVE_START_HOUR = 9
const ACTIVE_END_HOUR = 21

function isActiveHour() {
  const hour = new Date().getHours()
  return hour >= ACTIVE_START_HOUR && hour < ACTIVE_END_HOUR
}

// One entry per league fetched (wc excluded — dormant until WC 2030 fixtures
// exist) with the adapter that turns its matches() response into our common
// Game shape and the sport tile it belongs under.
const LEAGUES = [
  { league: 'epl', sportKey: 'soccer', adapt: m => adaptStandardMatch(m, 'soccer', 'epl') },
  { league: 'mls', sportKey: 'soccer', adapt: m => adaptStandardMatch(m, 'soccer', 'mls') },
  { league: 'mlb', sportKey: 'mlb', adapt: m => adaptStandardMatch(m, 'mlb', 'mlb') },
  { league: 'nba', sportKey: 'nba', adapt: m => adaptStandardMatch(m, 'nba', 'nba') },
  { league: 'nfl', sportKey: 'nfl', adapt: m => adaptStandardMatch(m, 'nfl', 'nfl') },
  { league: 'ncaaf', sportKey: 'ncaaf', adapt: m => adaptStandardMatch(m, 'ncaaf', 'ncaaf') },
  { league: 'ufc', sportKey: 'ufc', adapt: adaptUfcFight },
  { league: 'f1', sportKey: 'f1', adapt: adaptF1Session },
]

const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return res.json()
}

function emptyGamesByLeague() {
  const bySport = {}
  LEAGUES.forEach(({ league }) => { bySport[league] = [] })
  return bySport
}

function deriveGamesBySport(gamesByLeague) {
  const bySport = {}
  Object.keys(SPORTS).forEach(key => { bySport[key] = [] })
  LEAGUES.forEach(({ league, sportKey }) => {
    bySport[sportKey] = bySport[sportKey].concat(gamesByLeague[league])
  })
  return bySport
}

// Fans out across all 7 sport tiles at once, but — unlike useLeagueData's
// single-league all-or-nothing load — each league's games land in state as
// soon as THAT league's own request resolves, instead of waiting for every
// one of the 8 to settle. A couple of upstream providers (UFC's scoreboard
// scrape, NCAAF's wide day-by-day window) are reliably the slowest of the
// bunch; gating the whole homepage on them would mean nothing renders until
// the slowest provider answers. Fast leagues show up first; slower ones
// fill in afterward without blocking anything else.
function emptySettledLeagues() {
  const settled = {}
  LEAGUES.forEach(({ league }) => { settled[league] = false })
  return settled
}

export function useLiveFeed() {
  const [gamesByLeague, setGamesByLeague] = useState(emptyGamesByLeague)
  const [settledLeagues, setSettledLeagues] = useState(emptySettledLeagues)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

  const load = useCallback(() => {
    let settledCount = 0
    let anySucceeded = false

    LEAGUES.forEach(({ league, adapt }) => {
      fetchJSON(`/api/${league}/matches`)
        .then(data => {
          anySucceeded = true
          setGamesByLeague(prev => ({ ...prev, [league]: data.matches.map(adapt) }))
        })
        .catch(err => {
          console.warn(`useLiveFeed: ${league} matches failed`, err)
        })
        .finally(() => {
          settledCount += 1
          setSettledLeagues(prev => ({ ...prev, [league]: true }))
          setLoading(false) // flips false on the first league to land, not the last
          if (settledCount === LEAGUES.length) {
            setLastFetched(new Date())
            setError(anySucceeded ? null : 'Live data unavailable')
          }
        })
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const interval = setInterval(() => {
      if (isActiveHour()) load()
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [load])

  const games = useMemo(
    () => LEAGUES.flatMap(({ league }) => gamesByLeague[league]),
    [gamesByLeague]
  )
  const gamesBySport = useMemo(() => deriveGamesBySport(gamesByLeague), [gamesByLeague])

  // A sport counts as "still loading" until every league feeding it (soccer
  // is two: epl + mls) has settled — otherwise a slow league with a real
  // live game would flash "No games today" the moment a faster, unrelated
  // league finishes first and flips the shared `loading` flag off.
  const loadingSports = useMemo(() => {
    const pending = new Set()
    Object.keys(SPORTS).forEach(sportKey => {
      const settled = LEAGUES.filter(l => l.sportKey === sportKey).every(l => settledLeagues[l.league])
      if (!settled) pending.add(sportKey)
    })
    return pending
  }, [settledLeagues])

  return { games, gamesBySport, loadingSports, loading, error, lastFetched, refresh: load }
}
