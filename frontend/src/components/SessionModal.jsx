import { useEffect, useState } from 'react'
import { X, UserRound } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''
// OpenF1's position feed updates every few seconds during a live session —
// see providers/openf1.py's docstring — so this polls much more
// aggressively than the rest of the app's 60s cadence to actually deliver
// near-real-time positions while this modal is open.
const LIVE_REFRESH_MS = 15 * 1000

function DriverPhoto({ driver }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (driver?.photo && !imgFailed) {
    return (
      <img
        src={driver.photo}
        alt={driver.name}
        className="table-crest driver-photo"
        onError={() => setImgFailed(true)}
      />
    )
  }
  return (
    <div className="table-crest-placeholder driver-placeholder">
      <UserRound aria-hidden="true" />
    </div>
  )
}

function formatGap(gap) {
  if (gap === null || gap === undefined) return null
  if (typeof gap === 'string') return gap
  if (gap === 0) return 'Leader'
  return `+${gap.toFixed(3)}s`
}

export default function SessionModal({ match, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let interval = null

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/f1/sessions/${match.id}`)
        const data = await res.json()
        if (cancelled) return
        setDetail(data)
        setLoading(false)
        // Keep polling while the session is live and OpenF1 hasn't posted a
        // final classification yet; stop once it has (data.final).
        if (match.status === 'IN_PLAY' && !data.final && !interval) {
          interval = setInterval(load, LIVE_REFRESH_MS)
        } else if (data.final && interval) {
          clearInterval(interval)
          interval = null
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [match.id, match.status])

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isLive = match.status === 'IN_PLAY'
  const isFinished = match.status === 'FINISHED'
  const results = detail?.results || []
  const showGapColumn = Boolean(detail?.final)
  const positionsTitle = detail?.final ? 'Result' : isLive ? 'Current Positions' : 'Entry List'
  const date = new Date(match.utcDate)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal race-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${match.meetingName} ${match.session} details`}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close session details">
          <X aria-hidden="true" />
        </button>

        <div className="race-modal-hero">
          {match.circuitImage && (
            <div className="race-modal-track">
              <img className="race-track-diagram" src={match.circuitImage} alt="" />
            </div>
          )}
          <p className="race-modal-event-name">{match.meetingName}{match.location ? ` — ${match.location}` : ''}</p>
          <h2 className="race-modal-circuit-name">{match.session}</h2>
          <div className="race-modal-circuit-stats">
            <span>{date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {isLive && <span className="modal-badge modal-badge--live">Live</span>}
        </div>

        <div className="race-modal-positions">
          <h3 className="race-modal-positions-title">
            {positionsTitle}
            {isLive && !detail?.final && <span className="race-modal-positions-hint">Updates every 15 seconds</span>}
          </h3>
          {loading ? (
            <p className="empty-state">Loading positions…</p>
          ) : results.length > 0 ? (
            <ol className="race-position-list">
              {results.map(row => (
                <li
                  key={row.driver?.number ?? row.position}
                  className={`race-position-row${isFinished && row.position && row.position <= 3 ? ' race-position-row--podium' : ''}`}
                >
                  <span className="race-position-num">{row.position ?? '—'}</span>
                  <span
                    className="race-position-team-dot"
                    style={row.driver?.teamColor ? { background: `#${row.driver.teamColor}` } : undefined}
                    aria-hidden="true"
                  />
                  <DriverPhoto driver={row.driver} />
                  <span className="race-position-name">
                    {row.driver?.name || `Car ${row.driver?.number ?? '?'}`}
                    {row.dnf && <span className="race-position-tag"> DNF</span>}
                    {row.dns && <span className="race-position-tag"> DNS</span>}
                    {row.dsq && <span className="race-position-tag"> DSQ</span>}
                  </span>
                  {showGapColumn && (
                    <span className="race-position-gap">{formatGap(row.gap)}</span>
                  )}
                  {showGapColumn && row.points > 0 && (
                    <span className="race-position-points">{row.points} pts</span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-state">No entry list available yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
