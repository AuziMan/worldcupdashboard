import { memo } from 'react'
import { getTeamColor } from '@/lib/teamColors'
import { useSpoilers } from '@/providers/SpoilerProvider'
import FavoriteStar from './FavoriteStar'

const STATUS_LABELS = {
  SCHEDULED: 'Upcoming',
  TIMED: 'Upcoming',
  IN_PLAY: 'Live',
  LIVE: 'Live',
  PAUSED: 'Half Time',
  FINISHED: 'Final',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
  SUSPENDED: 'Delayed',
  AWARDED: 'Awarded',
}

// football-data.org's free tier never reports a live match minute for
// WC/EPL, so this approximates one from wall-clock time since kickoff —
// reasonable only because soccer halves are a fixed ~45 minutes (unlike
// basketball/football, which get a real per-quarter clock instead — see
// providers/espn.py's _quarter_clock()). Frozen at 45' during halftime
// rather than climbing with break time, and offset by a standard ~15-minute
// halftime once the second half is under way, so a match actually at minute
// 60 doesn't read as 75'.
const SOCCER_HALF_MINUTES = 45
const SOCCER_HALFTIME_MINUTES = 15

function estimateSoccerMinute(kickoff, status) {
  const wallClockMinutes = Math.round((Date.now() - kickoff) / 60000)
  if (status === 'PAUSED') return SOCCER_HALF_MINUTES
  if (wallClockMinutes <= SOCCER_HALF_MINUTES) return wallClockMinutes
  return Math.max(SOCCER_HALF_MINUTES, wallClockMinutes - SOCCER_HALFTIME_MINUTES)
}

// "Starting Soon" cards (kickoff within the next 4 hours, same window
// MatchSection buckets them by) show the actual kickoff time rather than a
// relative countdown — easier to scan at a glance than a ticking "in 12m".
function formatStartingSoonTime(kickoff) {
  const diff = kickoff - Date.now()
  if (diff <= 0 || diff > 4 * 60 * 60000) return null
  return kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function TeamSide({ team, isWinner, league }) {
  return (
    <div className={`team-side${isWinner ? ' team-side--winner' : ''}`}>
      {team?.crest ? (
        <img className="team-crest" src={team.crest} alt={team.shortName || team.name} />
      ) : (
        <div className="team-crest-placeholder">?</div>
      )}
      <span className="team-name">
        {team?.rank && <span className="team-rank">#{team.rank}</span>}
        {team?.shortName || team?.name || 'TBD'}
      </span>
      {isWinner && <span className="winner-label">Winner</span>}
      {league && team?.id && <FavoriteStar league={league} team={team} />}
    </div>
  )
}

function MatchCard({ match, onClick, showProgress = true, league }) {
  const { isScoreHidden, revealMatch } = useSpoilers()
  const { homeTeam, awayTeam, score, status, utcDate, stage, group, minute, period } = match

  const kickoff = new Date(utcDate)
  const isLive = status === 'IN_PLAY' || status === 'LIVE' || status === 'PAUSED'
  const isSuspended = status === 'SUSPENDED'
  const isFinished = status === 'FINISHED' || status === 'AWARDED'
  const isPending = !isLive && !isSuspended && !isFinished

  const homeScore = isLive || isSuspended || isFinished ? score?.fullTime?.home : null
  const awayScore = isLive || isSuspended || isFinished ? score?.fullTime?.away : null
  const hasScore = homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined

  const homeWins = hasScore && homeScore > awayScore
  const awayWins = hasScore && awayScore > homeScore

  // Provider gave us a live/finished match but no usable score (e.g. ESPN
  // dropped the field) — show a neutral placeholder rather than risk a stale
  // or wrong-looking number.
  const scoreUnavailable = (isLive || isFinished) && !hasScore

  // Sports with a real quarter/inning clock (basketball, football, baseball)
  // report a "period" string instead — prefer that when present, and never
  // fall back to a wall-clock guess for them (see estimateSoccerMinute below
  // for why that guess only makes sense for soccer in the first place).
  const elapsedMinutes = isLive && !period
    ? (minute ?? estimateSoccerMinute(kickoff, status))
    : null
  const progressPct = showProgress && (status === 'IN_PLAY' || status === 'LIVE') && elapsedMinutes != null
    ? Math.min((elapsedMinutes / 115) * 100, 100)
    : null

  const statusLabel = STATUS_LABELS[status] || status
  const startingSoonTime = isPending ? formatStartingSoonTime(kickoff) : null
  const spoilerHidden = isScoreHidden(match)
  const teamGradient = {
    '--team-home-color': getTeamColor(homeTeam),
    '--team-away-color': getTeamColor(awayTeam),
  }
  const accessibleHome = homeTeam?.shortName || homeTeam?.name || 'Home team'
  const accessibleAway = awayTeam?.shortName || awayTeam?.name || 'Away team'
  const accessibleResult = spoilerHidden
    ? 'score hidden'
    : hasScore ? `${homeScore} to ${awayScore}` : kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const homeColor = getTeamColor(homeTeam)
  const awayColor = getTeamColor(awayTeam)
  const cardStyle = {
    ...(homeColor ? { '--home-color': homeColor } : {}),
    ...(awayColor ? { '--away-color': awayColor } : {}),
  }

  return (
    <div
      className={`match-card ${isLive ? 'match-card--live' : ''} ${isSuspended ? 'match-card--suspended' : ''} ${isFinished ? 'match-card--finished' : ''} ${spoilerHidden ? 'match-card--spoiler' : ''}`}
      style={teamGradient}
    >
      <button
        className="match-card-open"
        onClick={onClick}
        aria-label={`${accessibleHome} versus ${accessibleAway}, ${statusLabel}, ${accessibleResult}. Open match details.`}
      />
      <div className="match-meta">
        <span className={`match-status match-status--${status?.toLowerCase()}`}>{statusLabel}</span>
        {isLive && period && <span className="match-minute">{period}</span>}
        {isLive && !period && elapsedMinutes != null && <span className="match-minute" aria-label={`${elapsedMinutes} minutes elapsed`}>{elapsedMinutes}′</span>}
        {group && <span className="match-group">{group.replace('GROUP_', 'Group ')}</span>}
      </div>

      <div className="match-teams">
        <TeamSide team={homeTeam} isWinner={isFinished && !spoilerHidden && homeWins} league={league} />
        <div className="match-vs">
          {spoilerHidden
            ? (
              <button
                className="spoiler-reveal"
                onClick={event => {
                  event.stopPropagation()
                  revealMatch(match.id)
                }}
                aria-label={`Reveal score for ${accessibleHome} versus ${accessibleAway}`}
              >
                Reveal score
              </button>
            )
            : hasScore
            ? <span className="match-score">{homeScore}<span className="match-score-sep"> – </span>{awayScore}</span>
            : scoreUnavailable
              ? <span className="match-score-unavailable">{isLive ? 'Active' : 'Score unavailable'}</span>
              : startingSoonTime
                ? <span className="match-countdown">{startingSoonTime}</span>
                : kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        </div>
        <TeamSide team={awayTeam} isWinner={isFinished && !spoilerHidden && awayWins} league={league} />
      </div>

      {progressPct !== null && (
        <div className="match-progress-bar" role="progressbar" aria-label="Estimated match progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progressPct)}>
          <div className="match-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      <div className="match-footer">
        {kickoff.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        {stage && <span className="match-stage">{stage.replace(/_/g, ' ')}</span>}
      </div>
    </div>
  )
}

export default memo(MatchCard)
