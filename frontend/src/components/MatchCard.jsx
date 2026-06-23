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

function TeamSide({ team, score }) {
  return (
    <div className="team-side">
      {team?.crest ? (
        <img className="team-crest" src={team.crest} alt={team.shortName || team.name} />
      ) : (
        <div className="team-crest-placeholder">?</div>
      )}
      <span className="team-name">{team?.shortName || team?.name || 'TBD'}</span>
      {score !== null && score !== undefined && (
        <span className="team-score">{score}</span>
      )}
    </div>
  )
}

function MatchMinute({ status, minute }) {
  if (status === 'PAUSED') {
    return <span className="match-minute match-minute--ht">HT</span>
  }
  if (status === 'IN_PLAY' && minute != null) {
    return <span className="match-minute">{minute}'</span>
  }
  return null
}

import { memo } from 'react'

function MatchCard({ match, onClick }) {
  const { homeTeam, awayTeam, score, status, utcDate, stage, group, minute } = match

  const kickoff = new Date(utcDate)
  const isLive = status === 'IN_PLAY' || status === 'LIVE' || status === 'PAUSED'
  const isSuspended = status === 'SUSPENDED'
  const isFinished = status === 'FINISHED' || status === 'AWARDED'
  const isPending = !isLive && !isSuspended && !isFinished

  const homeScore = isLive || isSuspended || isFinished ? score?.fullTime?.home : null
  const awayScore = isLive || isSuspended || isFinished ? score?.fullTime?.away : null

  const statusLabel = STATUS_LABELS[status] || status

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
        {isLive && <MatchMinute status={status} minute={minute} />}
        {group && <span className="match-group">{group.replace('GROUP_', 'Group ')}</span>}
      </div>

      <div className="match-teams">
        <TeamSide team={homeTeam} score={homeScore} />
        <div className="match-vs">
          {isPending
            ? kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'VS'}
        </div>
        <TeamSide team={awayTeam} score={awayScore} />
      </div>

      <div className="match-footer">
        {kickoff.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        {stage && <span className="match-stage">{stage.replace(/_/g, ' ')}</span>}
      </div>
    </div>
  )
}

export default memo(MatchCard)
