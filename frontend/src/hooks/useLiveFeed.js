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

// Fetches one league's matches for one time slice ("today" or "future" —
// see routes/leagues.py's `range` param) and adapts them into our common
// Game shape in one step.
function fetchScope(league, adapt, scope) {
  return fetchJSON(`/api/${league}/matches?range=${scope}`).then(data => data.matches.map(adapt))
}

function emptyGamesByLeague() {
  const state = {}
  LEAGUES.forEach(({ league }) => { state[league] = { today: [], future: [] } })
  return state
}

function deriveGamesBySport(gamesByLeague) {
  const bySport = {}
  Object.keys(SPORTS).forEach(key => { bySport[key] = [] })
  LEAGUES.forEach(({ league, sportKey }) => {
    const { today, future } = gamesByLeague[league]
    bySport[sportKey] = bySport[sportKey].concat(today, future)
  })
  return bySport
}

// Fans out across all 8 sport tiles at once, but each league loads in two
// waves instead of one: "today" first (live games plus anything else on
// today's date — the one slice that can make the page feel instant, since
// it's a single upstream request even for the ESPN/UFC providers that
// otherwise have to fan out across 91–226 days, see providers/espn.py's
// _day_offsets()), then "future" fills in quietly right after, per league,
// once that league's own "today" fetch has landed. There's no "past" wave:
// lib/liveFeed.js's selectFeatured/selectWheelGames/selectRailGames only
// ever look at live-or-upcoming games, so fetching finished games here
// would just be wasted work — the dashboards' own Past tab still gets the
// full history from the unscoped endpoint.
//
// Unlike useLeagueData's single-league all-or-nothing load, each league's
// "today" games land in state as soon as THAT league's own request
// resolves, instead of waiting for every one of the 8 to settle — a slow
// provider fills in afterward without blocking the fast ones.
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
    let todaySettledCount = 0
    let anySucceeded = false

    LEAGUES.forEach(({ league, adapt }) => {
      fetchScope(league, adapt, 'today')
        .then(games => {
          anySucceeded = true
          setGamesByLeague(prev => ({ ...prev, [league]: { ...prev[league], today: games } }))
        })
        .catch(err => {
          console.warn(`useLiveFeed: ${league} today matches failed`, err)
        })
        .finally(() => {
          todaySettledCount += 1
          setSettledLeagues(prev => ({ ...prev, [league]: true }))
          setLoading(false) // flips false on the first league's "today" to land, not the last
          if (todaySettledCount === LEAGUES.length) {
            setLastFetched(new Date())
            setError(anySucceeded ? null : 'Live data unavailable')
          }

          // Only starts once this league's "today" has resolved (success or
          // not) — never gates loading/settled, so a slow "future" fetch
          // can't hold up anything the first frame needs.
          fetchScope(league, adapt, 'future')
            .then(games => {
              setGamesByLeague(prev => ({ ...prev, [league]: { ...prev[league], future: games } }))
            })
            .catch(err => {
              console.warn(`useLiveFeed: ${league} future matches failed`, err)
            })
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
    () => LEAGUES.flatMap(({ league }) => {
      const { today, future } = gamesByLeague[league]
      return [...today, ...future]
    }),
    [gamesByLeague]
  )
  const gamesBySport = useMemo(() => deriveGamesBySport(gamesByLeague), [gamesByLeague])

  // A sport counts as "still loading" until every league feeding it (soccer
  // is two: epl + mls) has settled its "today" wave — otherwise a slow
  // league with a real live game would flash "No games today" the moment a
  // faster, unrelated league finishes first and flips the shared `loading`
  // flag off.
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
