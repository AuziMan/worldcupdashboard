/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, UserRound } from 'lucide-react'
import { getTeamColor } from '@/lib/teamColors'

const API_BASE = import.meta.env.VITE_API_URL || ''
const POSITION_ORDER = ['Goalkeeper', 'Defence', 'Midfield', 'Offence']
const POSITION_LABELS = {
  Goalkeeper: 'Goalkeepers',
  Defence: 'Defenders',
  Midfield: 'Midfielders',
  Offence: 'Forwards',
}

function ageFromBirthDate(dateOfBirth) {
  if (!dateOfBirth) return null
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function PlayerCard({ player, teamColor }) {
  const age = player.age ?? ageFromBirthDate(player.dateOfBirth)
  const stats = Object.entries(player.stats || {}).filter(([, value]) => value != null)

  return (
    <article className="player-card" style={{ '--player-team-color': teamColor }}>
      <div className="player-photo-wrap">
        {player.photo ? (
          <img className="player-photo" src={player.photo} alt={player.name} />
        ) : (
          <div className="player-photo-placeholder" aria-label="Player photo unavailable">
            <UserRound aria-hidden="true" />
          </div>
        )}
        {player.jersey && <span className="player-number">#{player.jersey}</span>}
      </div>

      <div className="player-card-copy">
        <span>{player.position || 'Squad member'}</span>
        <h3>{player.name}</h3>
      </div>

      {(age || player.nationality || player.height || player.weight) && (
        <div className="player-bio">
          {age && <span><strong>{age}</strong>Age</span>}
          {player.nationality && <span><strong>{player.nationality}</strong>Nation</span>}
          {player.height && <span><strong>{player.height}</strong>Height</span>}
          {player.weight && <span><strong>{player.weight}</strong>Weight</span>}
        </div>
      )}

      {stats.length > 0 && (
        <div className="player-stats">
          {stats.map(([label, value]) => (
            <span key={label}><strong>{value}</strong>{label}</span>
          ))}
        </div>
      )}
    </article>
  )
}

export default function TeamRoster({ team, league, onBack }) {
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const teamColor = getTeamColor(team)

  useEffect(() => {
    document.documentElement.style.setProperty('--active-team-color', teamColor)
    document.body.classList.add('team-roster-active')

    return () => {
      document.body.classList.remove('team-roster-active')
      document.documentElement.style.removeProperty('--active-team-color')
    }
  }, [teamColor])

  useEffect(() => {
    const controller = new AbortController()

    async function loadRoster() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${API_BASE}/api/${league}/teams/${team.id}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Roster data is unavailable right now.')
        setTeamData(await response.json())
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadRoster()
    return () => controller.abort()
  }, [league, team.id])

  const groups = useMemo(() => {
    const grouped = {}
    for (const player of teamData?.squad || []) {
      const position = player.position || 'Other'
      if (!grouped[position]) grouped[position] = []
      grouped[position].push(player)
    }
    return grouped
  }, [teamData])

  const positions = [
    ...POSITION_ORDER.filter(position => groups[position]?.length),
    ...Object.keys(groups).filter(position => !POSITION_ORDER.includes(position)),
  ]

  return (
    <section className="roster-view">
      <button className="roster-back" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        All teams
      </button>

      <header className="roster-header" style={{ '--roster-team-color': teamColor }}>
        <div className="roster-team-crest-wrap">
          {team.crest && <img src={team.crest} alt={`${team.name} crest`} />}
        </div>
        <div>
          <span>Team roster</span>
          <h1>{team.name}</h1>
          <p>
            {teamData?.coach?.name ? `Head coach · ${teamData.coach.name}` : 'First team squad'}
          </p>
        </div>
        {teamData?.squad && <strong>{teamData.squad.length}</strong>}
      </header>

      {loading && (
        <div className="roster-loading">
          <div className="spinner" />
          <p>Loading {team.shortName || team.name} roster…</p>
        </div>
      )}

      {error && <div className="error-banner"><strong>{error}</strong></div>}

      {!loading && !error && positions.length === 0 && (
        <p className="empty-state">No roster has been published for this team yet.</p>
      )}

      {!loading && !error && positions.map(position => (
        <section className="roster-position" key={position}>
          <div className="roster-position-heading">
            <h2>{POSITION_LABELS[position] || position}</h2>
            <span>{groups[position].length}</span>
          </div>
          <div className="player-grid">
            {groups[position].map(player => (
              <PlayerCard key={player.id} player={player} teamColor={teamColor} />
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}
