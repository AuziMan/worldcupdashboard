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

  const byStage = {}
  for (const m of knockout) {
    if (!byStage[m.stage]) byStage[m.stage] = []
    byStage[m.stage].push(m)
  }

  const thirdPlace = byStage['THIRD_PLACE'] || []
  const rounds = STAGE_ORDER.filter(s => byStage[s]?.length)

  return (
    <div className="bracket-outer">
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
              <div className="bracket-round-label">{STAGE_LABELS[stage]}</div>
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
                    {pair.length === 1 && <div className="bracket-slot bracket-slot--empty" />}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
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
