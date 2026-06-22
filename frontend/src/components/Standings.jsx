function GroupTable({ group }) {
  return (
    <div className="group-table">
      <h3 className="group-name">{group.group}</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>GD</th>
            <th className="pts">Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.table.map(row => (
            <tr key={row.team.id} className={row.position <= 2 ? 'row--qualify' : ''}>
              <td className="pos">{row.position}</td>
              <td className="team-cell">
                {row.team.crest && (
                  <img src={row.team.crest} alt={row.team.shortName} className="table-crest" />
                )}
                <span>{row.team.shortName || row.team.name}</span>
              </td>
              <td>{row.playedGames}</td>
              <td>{row.won}</td>
              <td>{row.draw}</td>
              <td>{row.lost}</td>
              <td>{row.goalsFor}</td>
              <td>{row.goalsAgainst}</td>
              <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
              <td className="pts">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Standings({ standings }) {
  const groups = standings?.standings

  if (!groups?.length) {
    return <p className="empty-state">Standings not yet available.</p>
  }

  return (
    <div className="standings-section">
      <h2 className="section-title">Group Stage Standings</h2>
      <div className="standings-grid">
        {groups.map((g, i) => (
          <GroupTable key={i} group={g} />
        ))}
      </div>
    </div>
  )
}
