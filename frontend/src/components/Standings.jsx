function buildFormMap(allMatches) {
  const finished = (allMatches || [])
    .filter(m => m.status === 'FINISHED' && m.score?.fullTime?.home != null)
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))

  const map = {}
  for (const m of finished) {
    const hId = m.homeTeam?.id
    const aId = m.awayTeam?.id
    const hG = m.score.fullTime.home
    const aG = m.score.fullTime.away

    if (hId) {
      if (!map[hId]) map[hId] = []
      map[hId].push(hG > aG ? 'W' : hG < aG ? 'L' : 'D')
    }
    if (aId) {
      if (!map[aId]) map[aId] = []
      map[aId].push(aG > hG ? 'W' : aG < hG ? 'L' : 'D')
    }
  }
  for (const id of Object.keys(map)) {
    map[id] = map[id].slice(-5)
  }
  return map
}

function GroupTable({ group, formMap, highlightTop }) {
  return (
    <div className="group-table">
      <h3 className="group-name">{group.group || 'Table'}</h3>
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
            <th className="form-th">Form</th>
          </tr>
        </thead>
        <tbody>
          {group.table.map(row => (
            <tr key={row.team.id} className={highlightTop && row.position <= 2 ? 'row--qualify' : ''}>
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
              <td>
                <div className="form-col">
                  {(formMap[row.team.id] || []).map((r, i) => (
                    <span key={i} className={`form-badge form-badge--${r.toLowerCase()}`}>{r}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Standings({ standings, matches, highlightTop = true }) {
  const groups = standings?.standings

  if (!groups?.length) {
    return <p className="empty-state">Standings will appear once matches get underway.</p>
  }

  const formMap = buildFormMap(matches?.matches)

  return (
    <div className="standings-section">
      <h2 className="section-title">{highlightTop ? 'Group Stage Standings' : 'Standings'}</h2>
      <div className="standings-grid">
        {groups.map((g, i) => (
          <GroupTable key={i} group={g} formMap={formMap} highlightTop={highlightTop} />
        ))}
      </div>
    </div>
  )
}
