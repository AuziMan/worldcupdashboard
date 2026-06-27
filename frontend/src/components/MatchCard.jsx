import { memo } from 'react'

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

function formatCountdown(kickoff) {
  const diff = kickoff - Date.now()
  if (diff <= 0 || diff > 4 * 3600000) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `in ${h}h ${m}m`
  if (m > 0) return `in ${m}m`
  return 'soon'
}

function TeamSide({ team, isWinner }) {
  return (
    <div className={`team-side${isWinner ? ' team-side--winner' : ''}`}>
      {team?.crest ? (
        <img className="team-crest" src={team.crest} alt={team.shortName || team.name} />
      ) : (
        <div className="team-crest-placeholder">?</div>
      )}
      <span className="team-name">{team?.shortName || team?.name || 'TBD'}</span>
    </div>
  )
}

function MatchCard({ match, onClick }) {
  const { homeTeam, awayTeam, score, status, utcDate, stage, group, minute } = match

  const kickoff = new Date(utcDate)
  const isLive = status === 'IN_PLAY' || status === 'LIVE' || status === 'PAUSED'
  const isSuspended = status === 'SUSPENDED'
  const isFinished = status === 'FINISHED' || status === 'AWARDED'
  const isPending = !isLive && !isSuspended && !isFinished

  const homeScore = isLive || isSuspended || isFinished ? score?.fullTime?.home : null
  const awayScore = isLive || isSuspended || isFinished ? score?.fullTime?.away : null
  const hasScore = homeScore !== null && homeScore !== undefined

  const homeWins = hasScore && homeScore > awayScore
  const awayWins = hasScore && awayScore > homeScore

  // Estimate minute from kickoff time if API doesn't provide it
  const estimatedMinute = isLive
    ? (minute ?? Math.min(Math.round((Date.now() - kickoff) / 60000), 90))
    : null
  const progressPct = (status === 'IN_PLAY' || status === 'LIVE') && estimatedMinute != null
    ? Math.min((estimatedMinute / 90) * 100, 100)
    : null

  const statusLabel = STATUS_LABELS[status] || status
  const countdown = isPending ? formatCountdown(kickoff) : null

  return (
    <div
      className={`match-card ${isLive ? 'match-card--live' : ''} ${isSuspended ? 'match-card--suspended' : ''} ${isFinished ? 'match-card--finished' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
    >
      <div className="match-meta">
        <span className={`match-status match-status--${status?.toLowerCase()}`}>{statusLabel}</span>
        {group && <span className="match-group">{group.replace('GROUP_', 'Group ')}</span>}
      </div>

      <div className="match-teams">
        <TeamSide team={homeTeam} isWinner={isFinished && homeWins} />
        <div className="match-vs">
          {hasScore
            ? <span className="match-score">{homeScore}<span className="match-score-sep"> – </span>{awayScore}</span>
            : countdown
              ? <span className="match-countdown">{countdown}</span>
              : kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        </div>
        <TeamSide team={awayTeam} isWinner={isFinished && awayWins} />
      </div>

      {progressPct !== null && (
        <div className="match-progress-bar">
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
