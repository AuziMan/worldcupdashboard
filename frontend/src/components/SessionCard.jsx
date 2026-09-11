import { memo } from 'react'
import { Flag, Gauge, Timer, Zap } from 'lucide-react'

const STATUS_LABELS = {
  SCHEDULED: 'Upcoming',
  IN_PLAY: 'Live',
  FINISHED: 'Final',
  CANCELLED: 'Cancelled',
}

const SESSION_ICONS = {
  Practice: Gauge,
  Qualifying: Timer,
  Sprint: Zap,
  Race: Flag,
}

// "Starting Soon" cards (start time within the next 4 hours) show the
// actual start time rather than a relative countdown — easier to scan at a
// glance than a ticking "in 12m".
function formatStartingSoonTime(date) {
  const diff = date - Date.now()
  if (diff <= 0 || diff > 4 * 60 * 60000) return null
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function SessionCard({ match, onClick }) {
  const { session, sessionType, status, utcDate, circuitImage } = match

  const date = new Date(utcDate)
  const isLive = status === 'IN_PLAY'
  const isFinished = status === 'FINISHED'
  const isPending = !isLive && !isFinished

  const statusLabel = STATUS_LABELS[status] || status
  const startingSoonTime = isPending ? formatStartingSoonTime(date) : null
  const SessionIcon = SESSION_ICONS[sessionType] || Flag

  return (
    <div className={`match-card session-card ${isLive ? 'match-card--live' : ''} ${isFinished ? 'match-card--finished' : ''}`}>
      {circuitImage && (
        <div className="session-card-bg" aria-hidden="true">
          <img className="session-card-track-bg" src={circuitImage} alt="" />
        </div>
      )}
      <button
        className="match-card-open"
        onClick={onClick}
        aria-label={`${session}, ${statusLabel}. Open session details.`}
      />
      <div className="race-card-content">
        <div className="match-meta">
          <span className={`match-status match-status--${status?.toLowerCase()}`}>{statusLabel}</span>
        </div>

        <div className="session-card-title">
          <SessionIcon className="session-card-icon" aria-hidden="true" />
          <span className="session-card-name">{session}</span>
        </div>

        <div className="match-vs">
          {isLive
            ? <span className="match-score-unavailable">Live</span>
            : startingSoonTime
              ? <span className="match-countdown">{startingSoonTime}</span>
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        </div>

        <div className="match-footer session-card-date">
          {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </div>
  )
}

export default memo(SessionCard)
