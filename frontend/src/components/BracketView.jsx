import BracketMatch from './BracketMatch'

const STAGE_ORDER = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL']
const STAGE_LABELS = {
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarterfinals',
  SEMI_FINALS: 'Semifinals',
  FINAL: 'Final',
  THIRD_PLACE: '3rd Place',
}

// Sort each stage's matches into correct bracket draw order by tracing team IDs
// backwards from later rounds (which have correct ID-based ordering).
function sortByBracket(rawByStage) {
  const stages = STAGE_ORDER.filter(s => rawByStage[s]?.length)

  const result = {}
  for (const s of stages) {
    result[s] = [...rawByStage[s]].sort((a, b) => a.id - b.id)
  }

  for (let i = stages.length - 2; i >= 0; i--) {
    const cur = stages[i]
    const next = stages[i + 1]

    const curMatches = result[cur]
    const nextMatches = result[next]

    const teamToMatch = new Map()
    for (const m of curMatches) {
      if (m.homeTeam?.id) teamToMatch.set(m.homeTeam.id, m)
      if (m.awayTeam?.id) teamToMatch.set(m.awayTeam.id, m)
    }

    const ordered = []
    const seen = new Set()

    for (const nextM of nextMatches) {
      for (const team of [nextM.homeTeam, nextM.awayTeam]) {
        if (!team?.id) continue
        const feeder = teamToMatch.get(team.id)
        if (feeder && !seen.has(feeder.id)) {
          ordered.push(feeder)
          seen.add(feeder.id)
        }
      }
    }

    // Append unmatched matches (TBD teams / incomplete data), preserving ID order
    for (const m of curMatches) {
      if (!seen.has(m.id)) ordered.push(m)
    }

    result[cur] = ordered
  }

  return result
}

export default function BracketView({ matches, onSelectMatch }) {
  if (!matches?.matches?.length) {
    return <p className="empty-state">No match data available yet. Check back soon!</p>
  }

  const knockout = matches.matches.filter(m => m.stage && m.stage !== 'GROUP_STAGE')

  if (!knockout.length) {
    return (
      <p className="empty-state">
        The bracket will fill in as teams advance through the group stage.
      </p>
    )
  }

  const rawByStage = {}
  for (const m of knockout) {
    if (!rawByStage[m.stage]) rawByStage[m.stage] = []
    rawByStage[m.stage].push(m)
  }

  const thirdPlace = rawByStage['THIRD_PLACE'] || []
  const byStage = sortByBracket(rawByStage)
  const rounds = STAGE_ORDER.filter(s => byStage[s]?.length)

  return (
    <div className="bracket-outer">
      <header className="bracket-view-header">
        <div>
          <span>Tournament path</span>
          <h1>Knockout bracket</h1>
        </div>
        <p>{rounds.length} rounds · Scroll to explore</p>
      </header>

      <div className="bracket-scroll">
        <div className="bracket">
          {rounds.map((stage, roundIdx) => {
            const stageMatches = byStage[stage]
            const isFirst = roundIdx === 0
            const isLast = roundIdx === rounds.length - 1

            const pairs = []
            for (let i = 0; i < stageMatches.length; i += 2) {
              pairs.push(stageMatches.slice(i, i + 2))
            }

            return (
              <div
                key={stage}
                className={`bracket-round ${isFirst ? 'bracket-round--first' : ''} ${isLast ? 'bracket-round--last' : ''}`}
              >
                <div className="bracket-round-label">
                  <span>{String(roundIdx + 1).padStart(2, '0')}</span>
                  {STAGE_LABELS[stage]}
                </div>
                <div className="bracket-slots">
                  {pairs.map((pair, pairIdx) => (
                    <div
                      key={pairIdx}
                      className={`bracket-pair ${!isLast && pair.length === 2 ? 'bracket-pair--connect' : ''}`}
                    >
                      {pair.map(match => (
                        <div key={match.id} className="bracket-slot">
                          <BracketMatch match={match} onClick={() => onSelectMatch(match)} />
                        </div>
                      ))}
                      {pair.length === 1 && !isLast && <div className="bracket-slot bracket-slot--empty" />}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {thirdPlace.length > 0 && (
        <div className="bracket-third">
          <div className="bracket-third-label">{STAGE_LABELS['THIRD_PLACE']}</div>
          {thirdPlace.map(m => (
            <BracketMatch key={m.id} match={m} onClick={() => onSelectMatch(m)} />
          ))}
        </div>
      )}
    </div>
  )
}
