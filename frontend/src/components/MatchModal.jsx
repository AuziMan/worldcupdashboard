import { useEffect, useState } from 'react'
import { getTeamColor } from '../data/teamColors'

const API_BASE = import.meta.env.VITE_API_URL || ''

const POSITION_ORDER = ['Goalkeeper', 'Defence', 'Midfield', 'Offence']
const POSITION_LABELS = {
  Goalkeeper: 'Goalkeepers',
  Defence: 'Defenders',
  Midfield: 'Midfielders',
  Offence: 'Forwards',
}

function groupByPosition(squad) {
  const groups = {}
  for (const p of squad) {
    const pos = p.position || 'Unknown'
    if (!groups[pos]) groups[pos] = []
    groups[pos].push(p)
  }
  return groups
}

function Squad({ teamData, loading }) {
  if (loading) return <div className="squad-loading">Loading squad…</div>
  if (!teamData) return <div className="squad-loading">Squad unavailable</div>

  const { coach, squad = [] } = teamData
  const groups = groupByPosition(squad)

  return (
    <div className="squad">
      {coach?.name && (
        <div className="squad-coach">
          <span className="squad-coach-label">Coach</span>
          <span className="squad-coach-name">{coach.name}</span>
        </div>
      )}
      {POSITION_ORDER.filter(pos => groups[pos]).map(pos => (
        <div key={pos} className="squad-group">
          <h4 className="squad-position-label">{POSITION_LABELS[pos] || pos}</h4>
          <ul className="squad-list">
            {groups[pos].map(player => (
              <li key={player.id} className="squad-player">
                {player.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function MatchModal({ match, league, onClose }) {
  const [homeTeamData, setHomeTeamData] = useState(null)
  const [awayTeamData, setAwayTeamData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSquads() {
      setLoading(true)
      try {
        const [home, away] = await Promise.all([
          fetch(`${API_BASE}/api/${league}/teams/${match.homeTeam.id}`).then(r => r.json()),
          fetch(`${API_BASE}/api/${league}/teams/${match.awayTeam.id}`).then(r => r.json()),
        ])
        setHomeTeamData(home)
        setAwayTeamData(away)
      } catch {
        // squads remain null, Squad component handles it
      } finally {
        setLoading(false)
      }
    }
    fetchSquads()
  }, [league, match.homeTeam.id, match.awayTeam.id])

  // Close on backdrop click or Escape key
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { homeTeam, awayTeam, score, status, utcDate, group, stage, referees } = match
  const isLive = status === 'IN_PLAY' || status === 'PAUSED'
  const isFinished = status === 'FINISHED'
  const hasScore = score?.fullTime?.home != null && score?.fullTime?.away != null
  const showScore = (isLive || isFinished) && hasScore
  const scoreUnavailable = (isLive || isFinished) && !hasScore
  const kickoff = new Date(utcDate)
  const referee = referees?.[0]

  const homeColor = getTeamColor(homeTeam)
  const awayColor = getTeamColor(awayTeam)
  const heroStyle = {
    ...(homeColor ? { '--home-color': homeColor } : {}),
    ...(awayColor ? { '--away-color': awayColor } : {}),
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="modal-header" style={heroStyle}>
          <div className="modal-team">
            {homeTeam.crest && <img src={homeTeam.crest} alt={homeTeam.name} className="modal-crest" />}
            <span className="modal-team-name">{homeTeam.name}</span>
          </div>

          <div className="modal-score-block">
            {showScore ? (
              <div className="modal-score">
                <span>{score.fullTime.home}</span>
                <span className="modal-score-sep">–</span>
                <span>{score.fullTime.away}</span>
              </div>
            ) : scoreUnavailable ? (
              <div className="modal-kickoff">{isLive ? 'Active' : 'Score unavailable'}</div>
            ) : (
              <div className="modal-kickoff">
                {kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            <div className="modal-status-row">
              <span className={`modal-badge ${isLive ? 'modal-badge--live' : ''}`}>
                {status === 'IN_PLAY' ? 'Live' : status === 'PAUSED' ? 'Half Time' : status === 'FINISHED' ? 'Final' : 'Upcoming'}
              </span>
            </div>
            <div className="modal-meta-row">
              {group && <span>{group.replace('GROUP_', 'Group ')}</span>}
              {stage && <span>{stage.replace(/_/g, ' ')}</span>}
            </div>
            {referee && (
              <div className="modal-referee">Referee: {referee.name}</div>
            )}
          </div>

          <div className="modal-team modal-team--away">
            {awayTeam.crest && <img src={awayTeam.crest} alt={awayTeam.name} className="modal-crest" />}
            <span className="modal-team-name">{awayTeam.name}</span>
          </div>
        </div>

        <div className="modal-squads">
          <div className="modal-squad-col">
            <h3 className="modal-squad-title">{homeTeam.shortName} Squad</h3>
            <Squad teamData={homeTeamData} loading={loading} />
          </div>
          <div className="modal-divider" />
          <div className="modal-squad-col">
            <h3 className="modal-squad-title">{awayTeam.shortName} Squad</h3>
            <Squad teamData={awayTeamData} loading={loading} />
          </div>
        </div>

      </div>
    </div>
  )
}
