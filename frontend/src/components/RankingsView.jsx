import { useState } from 'react'
import { UserRound } from 'lucide-react'

function RankedFighterPhoto({ fighter }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (fighter.photo && !imgFailed) {
    return (
      <img
        src={fighter.photo}
        alt={fighter.name}
        className="table-crest fighter-photo"
        onError={() => setImgFailed(true)}
      />
    )
  }
  return (
    <div className="table-crest-placeholder fighter-placeholder">
      <UserRound aria-hidden="true" />
    </div>
  )
}

function DivisionTable({ group }) {
  return (
    <div className="group-table">
      <h3 className="group-name">{group.group}</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Fighter</th>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          {group.table.map(row => (
            <tr key={row.fighter.id}>
              <td className="pos">{row.position}</td>
              <td className="team-cell">
                <RankedFighterPhoto fighter={row.fighter} />
                <span>{row.fighter.shortName || row.fighter.name}</span>
              </td>
              <td>{row.record}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function RankingsView({ standings }) {
  const groups = standings?.standings

  if (!groups?.length) {
    return <p className="empty-state">Rankings will appear once fighter data is available.</p>
  }

  return (
    <div className="standings-section">
      <h2 className="section-title">Divisional Rankings</h2>
      <div className="standings-grid">
        {groups.map((g, i) => (
          <DivisionTable key={i} group={g} />
        ))}
      </div>
    </div>
  )
}
