import { useEffect, useState } from 'react'
import { X, UserRound } from 'lucide-react'

// UFC's detail view, deliberately lighter than MatchModal: there's no
// fighter-roster/detail endpoint to fetch from (see providers/ufc.py's
// module docstring — /api/ufc/teams is an intentional empty stub), so
// unlike MatchModal this needs no effect/fetch at all — everything shown
// here already came down on the fight's own matches-list entry.
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

function FighterPhoto({ fighter }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (fighter?.photo && !imgFailed) {
    return (
      <img
        className="modal-crest fighter-photo"
        src={fighter.photo}
        alt={fighter.name}
        onError={() => setImgFailed(true)}
      />
    )
  }
  return (
    <div className="modal-crest modal-crest-placeholder fighter-placeholder">
      <UserRound aria-hidden="true" />
    </div>
  )
}

function FighterColumn({ fighter, isWinner, align }) {
  return (
    <div className={`modal-team${align === 'away' ? ' modal-team--away' : ''}`}>
      <FighterPhoto fighter={fighter} />
      <span className="modal-team-name">{fighter?.name || 'TBD'}</span>
      {fighter?.record && <span className="modal-fighter-record">{fighter.record}</span>}
      {isWinner && <span className="winner-label">Winner</span>}
    </div>
  )
}

export default function FightModal({ match, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { fighter1, fighter2, status, utcDate, event, weightClass, result } = match
  const isLive = status === 'IN_PLAY' || status === 'LIVE' || status === 'PAUSED'
  const isFinished = status === 'FINISHED'
  const date = new Date(utcDate)

  const fighter1Wins = isFinished && result?.winnerId && result.winnerId === fighter1?.id
  const fighter2Wins = isFinished && result?.winnerId && result.winnerId === fighter2?.id

  const statusLabel = STATUS_LABELS[status] || status
  const accessibleFighter1 = fighter1?.name || 'Fighter 1'
  const accessibleFighter2 = fighter2?.name || 'Fighter 2'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${accessibleFighter1} versus ${accessibleFighter2} fight details`}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close fight details">
          <X aria-hidden="true" />
        </button>

        <div className="modal-header">
          <FighterColumn fighter={fighter1} isWinner={fighter1Wins} />

          <div className="modal-score-block">
            <div className="modal-kickoff">
              {isFinished
                ? (result?.method || 'Final')
                : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="modal-status-row">
              <span className={`modal-badge ${isLive ? 'modal-badge--live' : ''}`}>{statusLabel}</span>
              {isFinished && result?.round && <span className="modal-badge">Round {result.round}</span>}
            </div>
            <div className="modal-meta-row">
              {weightClass && <span>{weightClass}</span>}
              {event && <span>{event}</span>}
            </div>
            <div className="modal-referee">
              {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>

          <FighterColumn fighter={fighter2} isWinner={fighter2Wins} align="away" />
        </div>
      </div>
    </div>
  )
}
