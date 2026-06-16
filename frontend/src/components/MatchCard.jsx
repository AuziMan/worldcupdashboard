const STATUS_LABELS = {
  SCHEDULED: 'Upcoming',
  TIMED: 'Upcoming',
  IN_PLAY: 'Live',
  PAUSED: 'Half Time',
  FINISHED: 'Final',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
  SUSPENDED: 'Suspended',
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

export default function MatchCard({ match }) {
  const { homeTeam, awayTeam, score, status, utcDate, stage, group } = match

  const kickoff = new Date(utcDate)
  const isLive = status === 'IN_PLAY' || status === 'PAUSED'
  const isFinished = status === 'FINISHED'
  const isPending = !isLive && !isFinished

  const homeScore = isLive || isFinished ? score?.fullTime?.home : null
  const awayScore = isLive || isFinished ? score?.fullTime?.away : null

  const statusLabel = STATUS_LABELS[status] || status

  return (
    <div className={`match-card ${isLive ? 'match-card--live' : ''} ${isFinished ? 'match-card--finished' : ''}`}>
      <div className="match-meta">
        <span className={`match-status match-status--${status?.toLowerCase()}`}>{statusLabel}</span>
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
