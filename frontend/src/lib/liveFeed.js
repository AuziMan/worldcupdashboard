import { isLiveStatus, estimateSoccerMinute } from './matchFormat'

// Normalized shape every homepage component (ticker/wheel/rail/tile) reads,
// regardless of which backend provider the game came from:
//   { id, sportKey, leagueKey, status, utcDate, isLive,
//     labelLeft, labelRight, imageLeft, imageRight, scoreText, statusText }
// labelRight/imageRight are null for F1 (one session, no "away" side) —
// that's the only conditional renderers need (paired vs. single-entity).

export function adaptStandardMatch(match, sportKey, leagueKey) {
  const { id, utcDate, status, homeTeam, awayTeam, score, minute, period } = match
  const kickoff = new Date(utcDate)
  const live = isLiveStatus(status)
  const homeScore = score?.fullTime?.home
  const awayScore = score?.fullTime?.away
  const hasScore = homeScore != null && awayScore != null
  const elapsed = live && !period ? (minute ?? estimateSoccerMinute(kickoff, status)) : null

  return {
    id: `${leagueKey}-${id}`,
    sportKey,
    leagueKey,
    status,
    utcDate: kickoff,
    isLive: live,
    labelLeft: homeTeam?.shortName || homeTeam?.name || 'TBD',
    labelRight: awayTeam?.shortName || awayTeam?.name || 'TBD',
    imageLeft: homeTeam?.crest || null,
    imageRight: awayTeam?.crest || null,
    scoreText: live && hasScore ? `${homeScore}–${awayScore}` : null,
    statusText: live ? (period || (elapsed != null ? `${elapsed}′` : null)) : null,
  }
}

export function adaptUfcFight(fight) {
  const { id, utcDate, status, weightClass, fighter1, fighter2 } = fight
  return {
    id: `ufc-${id}`,
    sportKey: 'ufc',
    leagueKey: 'ufc',
    status,
    utcDate: new Date(utcDate),
    isLive: isLiveStatus(status),
    labelLeft: fighter1?.shortName || fighter1?.name || 'TBD',
    labelRight: fighter2?.shortName || fighter2?.name || 'TBD',
    imageLeft: fighter1?.photo || null,
    imageRight: fighter2?.photo || null,
    scoreText: null,
    statusText: weightClass || null,
  }
}

export function adaptF1Session(entry) {
  const { id, utcDate, status, session: sessionLabel, sessionType, meetingName, location, circuitImage, countryFlag } = entry
  const name = sessionLabel || sessionType || 'Session'
  return {
    id: `f1-${id}`,
    sportKey: 'f1',
    leagueKey: 'f1',
    status,
    utcDate: new Date(utcDate),
    isLive: isLiveStatus(status),
    labelLeft: meetingName ? `${name} — ${meetingName}` : name,
    labelRight: null,
    imageLeft: circuitImage || countryFlag || null,
    imageRight: null,
    scoreText: null,
    statusText: location || null,
  }
}

export function isUpcomingGame(game) {
  return game.status === 'SCHEDULED' || game.status === 'TIMED'
}

export function byUtcDateAsc(a, b) {
  return a.utcDate - b.utcDate
}

// The single most relevant game for a sport: its first live game, else its
// soonest upcoming one, else null. Shared by the ticker and the tile
// headline so "what counts as relevant" is defined in exactly one place.
export function selectFeatured(games) {
  if (!games || games.length === 0) return null
  const live = games.find(g => g.isLive)
  if (live) return live
  const upcoming = games.filter(isUpcomingGame).sort(byUtcDateAsc)
  return upcoming[0] || null
}

// Every live game across every sport; if nothing is live anywhere, the next
// several upcoming games instead (soonest first).
export function selectWheelGames(games, cap = 10) {
  const live = games.filter(g => g.isLive)
  if (live.length) return live
  return games.filter(isUpcomingGame).sort(byUtcDateAsc).slice(0, cap)
}

// One sport's live games, else its soonest upcoming ones.
export function selectRailGames(games, cap = 6) {
  const live = games.filter(g => g.isLive)
  if (live.length) return live.slice(0, cap)
  return games.filter(isUpcomingGame).sort(byUtcDateAsc).slice(0, cap)
}

// "Arsenal 2–1 Chelsea" | "Pereira vs Ankalaev" | "Qualifying — Las Vegas GP"
export function pairText(game) {
  if (!game.labelRight) return game.labelLeft || ''
  if (game.scoreText) return `${game.labelLeft} ${game.scoreText} ${game.labelRight}`
  return `${game.labelLeft} vs ${game.labelRight}`
}

function formatKickoff(date) {
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const sameDay = date.toDateString() === new Date().toDateString()
  if (sameDay) return time
  return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`
}

// "Arsenal 2–1 Chelsea · 67′" | "Next: Sun 1:00 PM" | "No games today"
export function formatHeadline(game) {
  if (!game) return 'No games today'
  if (game.isLive) return [pairText(game), game.statusText].filter(Boolean).join(' · ')
  return `Next: ${formatKickoff(game.utcDate)}`
}
