import { useState } from 'react'
import { UserRound } from 'lucide-react'

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

function ConstructorSwatch({ team }) {
  return (
    <div
      className="table-crest-placeholder constructor-swatch"
      style={team?.color ? { background: `#${team.color}` } : undefined}
      aria-hidden="true"
    />
  )
}

function StandingsTable({ group }) {
  const isConstructors = group.table[0] && 'team' in group.table[0]

  return (
    <div className="group-table">
      <h3 className="group-name">{group.group}</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>{isConstructors ? 'Team' : 'Driver'}</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {group.table.map(row => {
            const who = row.driver || row.team
            return (
              <tr key={who?.id ?? row.position}>
                <td className="pos">{row.position}</td>
                <td className="team-cell">
                  {isConstructors ? <ConstructorSwatch team={row.team} /> : <DriverPhoto driver={row.driver} />}
                  <span>{who?.shortName || who?.name}</span>
                </td>
                <td>{row.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function F1StandingsView({ standings }) {
  const groups = standings?.standings

  if (!groups?.length) {
    return <p className="empty-state">Standings will appear once the season is underway.</p>
  }

  return (
    <div className="standings-section">
      <h2 className="section-title">Championship Standings</h2>
      <div className="standings-grid">
        {groups.map((g, i) => (
          <StandingsTable key={i} group={g} />
        ))}
      </div>
    </div>
  )
}
