import { useState } from 'react'
import MatchCard from './MatchCard'

const todayLabel = new Date().toLocaleDateString([], {
  weekday: 'long', month: 'long', day: 'numeric',
})

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

function matchesTeam(m, query) {
  const q = query.toLowerCase()
  return (
    m.homeTeam?.name?.toLowerCase().includes(q) ||
    m.homeTeam?.shortName?.toLowerCase().includes(q) ||
    m.awayTeam?.name?.toLowerCase().includes(q) ||
    m.awayTeam?.shortName?.toLowerCase().includes(q)
  )
}

export default function MatchSection({ matches, onSelectMatch }) {
  const [query, setQuery] = useState('')

  if (!matches?.matches?.length) {
    return <p className="empty-state">No matches to show right now. Check back soon!</p>
  }

  const all = matches.matches
  const now = new Date()
  const hasTeams = m => m.homeTeam?.name && m.awayTeam?.name
  const passesFilter = query
    ? m => hasTeams(m) && matchesTeam(m, query)
    : hasTeams

  const live = all.filter(m =>
    (m.status === 'IN_PLAY' || m.status === 'LIVE' || m.status === 'PAUSED' || m.status === 'SUSPENDED') &&
    passesFilter(m)
  )
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000)
  const upcoming = all
    .filter(m => (m.status === 'SCHEDULED' || m.status === 'TIMED') && passesFilter(m))
    .filter(m => new Date(m.utcDate) >= twoHoursAgo)
  const recent = all
    .filter(m => m.status === 'FINISHED' && passesFilter(m))
    .reverse()

  const upcomingByDate = groupByDate(upcoming)
  const noResults = query && live.length === 0 && upcoming.length === 0 && recent.length === 0

  return (
    <div className="match-section">
      <div className="match-filter">
        <input
          className="match-filter-input"
          type="text"
          placeholder="Filter by team…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button className="match-filter-clear" onClick={() => setQuery('')} aria-label="Clear filter">✕</button>
        )}
      </div>

      {noResults && (
        <p className="empty-state">No matches found for "{query}".</p>
      )}

      {live.length > 0 && (
        <section>
          <h2 className="section-title section-title--live">Live Now</h2>
          <div className="match-grid">
            {live.map(m => <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m)} />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="section-title">Upcoming Matches</h2>
          {Object.entries(upcomingByDate).map(([date, dayMatches]) => (
            <div key={date}>
              <h3 className={`date-divider${date === todayLabel ? ' date-divider--today' : ''}`}>{date}</h3>
              <div className="match-grid">
                {dayMatches.map(m => <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m)} />)}
              </div>
            </div>
          ))}
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="section-title">Recent Results</h2>
          <div className="match-grid">
            {recent.map(m => <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m)} />)}
          </div>
        </section>
      )}
    </div>
  )
}
