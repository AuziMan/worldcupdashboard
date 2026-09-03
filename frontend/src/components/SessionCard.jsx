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

function formatCountdown(date) {
  const diff = date - Date.now()
  if (diff <= 0 || diff > 4 * 60 * 60000) return null
  const m = Math.ceil(diff / 60000)
  if (m >= 60) return `in ${Math.floor(m / 60)}h ${m % 60}m`
  if (m > 0) return `in ${m}m`
  return 'soon'
}

function SessionCard({ match, onClick }) {
  const { session, sessionType, status, utcDate, circuitImage } = match

  const date = new Date(utcDate)
  const isLive = status === 'IN_PLAY'
  const isFinished = status === 'FINISHED'
  const isPending = !isLive && !isFinished

  const statusLabel = STATUS_LABELS[status] || status
  const countdown = isPending ? formatCountdown(date) : null
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
            : countdown
              ? <span className="match-countdown">{countdown}</span>
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
