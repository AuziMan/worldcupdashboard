import { memo, useState } from 'react'
import { UserRound } from 'lucide-react'

const STATUS_LABELS = {
  SCHEDULED: 'Upcoming',
  TIMED: 'Upcoming',
  IN_PLAY: 'Live',
  LIVE: 'Live',
  PAUSED: 'Live',
  FINISHED: 'Final',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
  SUSPENDED: 'Delayed',
}

// "Starting Soon" cards (start time within the next 4 hours) show the
// actual start time rather than a relative countdown — easier to scan at a
// glance than a ticking "in 12m".
function formatStartingSoonTime(date) {
  const diff = date - Date.now()
  if (diff <= 0 || diff > 4 * 60 * 60000) return null
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function FighterSide({ fighter, isWinner }) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div className={`team-side${isWinner ? ' team-side--winner' : ''}`}>
      {fighter?.photo && !imgFailed ? (
        <img
          className="team-crest fighter-photo"
          src={fighter.photo}
          alt={fighter.name}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="team-crest-placeholder fighter-placeholder">
          <UserRound aria-hidden="true" />
        </div>
      )}
      <span className="team-name">{fighter?.shortName || fighter?.name || 'TBD'}</span>
      {fighter?.record && <span className="fighter-record">{fighter.record}</span>}
      {isWinner && <span className="winner-label">Winner</span>}
    </div>
  )
}

function FightCard({ match, onClick }) {
  const { fighter1, fighter2, status, utcDate, event, weightClass, result } = match

  const date = new Date(utcDate)
  const isLive = status === 'IN_PLAY' || status === 'LIVE' || status === 'PAUSED'
  const isFinished = status === 'FINISHED'
  const isPending = !isLive && !isFinished

  const fighter1Wins = isFinished && result?.winnerId === fighter1?.id
  const fighter2Wins = isFinished && result?.winnerId === fighter2?.id

  const statusLabel = STATUS_LABELS[status] || status
  const startingSoonTime = isPending ? formatStartingSoonTime(date) : null

  const accessibleFighter1 = fighter1?.name || 'Fighter 1'
  const accessibleFighter2 = fighter2?.name || 'Fighter 2'

  return (
    <div className={`match-card ${isLive ? 'match-card--live' : ''} ${isFinished ? 'match-card--finished' : ''}`}>
      <button
        className="match-card-open"
        onClick={onClick}
        aria-label={`${accessibleFighter1} versus ${accessibleFighter2}, ${statusLabel}. Open fight details.`}
      />
      <div className="match-meta">
        <span className={`match-status match-status--${status?.toLowerCase()}`}>{statusLabel}</span>
        {weightClass && <span className="match-group">{weightClass}</span>}
      </div>

      <div className="match-teams">
        <FighterSide fighter={fighter1} isWinner={fighter1Wins} />
        <div className="match-vs">
          {isFinished
            ? <span className="match-score-unavailable">{result?.method || 'Final'}{result?.round ? ` · R${result.round}` : ''}</span>
            : startingSoonTime
              ? <span className="match-countdown">{startingSoonTime}</span>
              : isLive
                ? <span className="match-score-unavailable">Live</span>
                : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        </div>
        <FighterSide fighter={fighter2} isWinner={fighter2Wins} />
      </div>

      <div className="match-footer">
        {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        {event && <span className="match-stage">{event}</span>}
      </div>
    </div>
  )
}

export default memo(FightCard)
