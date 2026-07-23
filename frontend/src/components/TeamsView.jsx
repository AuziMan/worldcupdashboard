/* eslint-disable react/prop-types */
import { useState } from 'react'
import { getTeamColor } from '@/lib/teamColors'
import TeamRoster from './TeamRoster'

function collectTeams(matches, standings) {
  const teams = new Map()

  for (const group of standings?.standings || []) {
    for (const row of group.table || []) {
      if (!row.team?.id) continue
      teams.set(String(row.team.id), {
        ...row.team,
        group: group.group || null,
        position: row.position,
        playedGames: row.playedGames,
        points: row.points,
      })
    }
  }

  for (const match of matches?.matches || []) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!team?.id || !team?.name) continue
      const key = String(team.id)
      const existing = teams.get(key)
      teams.set(key, {
        ...team,
        ...existing,
        crest: existing?.crest || team.crest,
        group: existing?.group || match.group || null,
      })
    }
  }

  return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function formatGroup(group) {
  return group?.replace('GROUP_', 'Group ') || null
}

function TeamDirectoryCard({ team, onSelect }) {
  const teamColor = { '--team-directory-color': getTeamColor(team) }
  const hasStanding = team.position != null

  return (
    <button className="team-directory-card" style={teamColor} onClick={() => onSelect(team)}>
      <div className="team-directory-crest-wrap">
        {team.crest
          ? <img className="team-directory-crest" src={team.crest} alt="" />
          : <span className="team-directory-placeholder">{team.name.charAt(0)}</span>
        }
      </div>

      <div className="team-directory-copy">
        <span className="team-directory-kicker">
          {formatGroup(team.group) || team.tla || 'League team'}
        </span>
        <h2>{team.name}</h2>
        {team.shortName && team.shortName !== team.name && (
          <p>{team.shortName}</p>
        )}
      </div>

      {hasStanding && (
        <div className="team-directory-stats" aria-label={`${team.name} standing`}>
          <span><strong>{team.position}</strong> Position</span>
          <span><strong>{team.playedGames}</strong> Played</span>
          <span><strong>{team.points}</strong> Points</span>
        </div>
      )}
    </button>
  )
}

export default function TeamsView({ matches, standings, league }) {
  const [selectedTeam, setSelectedTeam] = useState(null)
  const teams = collectTeams(matches, standings)

  if (selectedTeam) {
    return (
      <TeamRoster
        team={selectedTeam}
        league={league}
        onBack={() => setSelectedTeam(null)}
      />
    )
  }

  if (!teams.length) {
    return <p className="empty-state">Team information will appear once league data is available.</p>
  }

  return (
    <section className="teams-view">
      <header className="teams-view-header">
        <div>
          <span>League directory</span>
          <h1>All teams</h1>
        </div>
        <strong>{teams.length}</strong>
      </header>

      <div className="teams-directory-grid">
        {teams.map(team => (
          <TeamDirectoryCard key={team.id} team={team} onSelect={setSelectedTeam} />
        ))}
      </div>
    </section>
  )
}
