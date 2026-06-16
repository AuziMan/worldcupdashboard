import MatchCard from './MatchCard'

function groupByDate(matches) {
  const groups = {}
  for (const m of matches) {
    const date = new Date(m.utcDate).toLocaleDateString([], {
      weekday: 'long', month: 'long', day: 'numeric',
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(m)
  }
  return groups
}

export default function MatchSection({ matches }) {
  if (!matches?.matches?.length) {
    return <p className="empty-state">No matches found.</p>
  }

  const all = matches.matches
  const now = new Date()

  const live = all.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED')
  const upcoming = all
    .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
    .filter(m => new Date(m.utcDate) >= now)
    .slice(0, 12)
  const recent = all
    .filter(m => m.status === 'FINISHED')
    .slice(-6)
    .reverse()

  const upcomingByDate = groupByDate(upcoming)

  return (
    <div className="match-section">
      {live.length > 0 && (
        <section>
          <h2 className="section-title section-title--live">Live Now</h2>
          <div className="match-grid">
            {live.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="section-title">Upcoming Matches</h2>
          {Object.entries(upcomingByDate).map(([date, dayMatches]) => (
            <div key={date}>
              <h3 className="date-divider">{date}</h3>
              <div className="match-grid">
                {dayMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </div>
          ))}
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="section-title">Recent Results</h2>
          <div className="match-grid">
            {recent.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}
    </div>
  )
}
