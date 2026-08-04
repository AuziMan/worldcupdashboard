import { useState } from 'react'
import { Search, X } from 'lucide-react'
import FightCard from './FightCard'
import { Tooltip } from './ui/Tooltip'

function groupByEvent(fights) {
  const groups = {}
  for (const m of fights) {
    const key = m.event || 'TBA'
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }
  return groups
}

function matchesFighter(m, query) {
  const q = query.toLowerCase()
  return (
    m.fighter1?.name?.toLowerCase().includes(q) ||
    m.fighter2?.name?.toLowerCase().includes(q)
  )
}

export default function FightSection({ matches, onSelectMatch }) {
  const [query, setQuery] = useState('')

  if (!matches?.matches?.length) {
    return <p className="empty-state">No fights to show right now. Check back soon!</p>
  }

  const all = matches.matches
  const now = new Date()
  const hasFighters = m => m.fighter1?.name && m.fighter2?.name
  const passesFilter = query
    ? m => hasFighters(m) && matchesFighter(m, query)
    : hasFighters

  const live = all.filter(m =>
    (m.status === 'IN_PLAY' || m.status === 'LIVE' || m.status === 'PAUSED') && passesFilter(m)
  )
  const upcoming = all
    .filter(m => (m.status === 'SCHEDULED' || m.status === 'TIMED') && passesFilter(m))
    .filter(m => new Date(m.utcDate) >= now)
  const recent = all
    .filter(m => m.status === 'FINISHED' && passesFilter(m))
    .reverse()

  const upcomingByEvent = groupByEvent(upcoming)
  const recentByEvent = groupByEvent(recent)
  const noResults = query && live.length === 0 && upcoming.length === 0 && recent.length === 0

  return (
    <div className="match-section">
      <div className="match-filter">
        <Search className="match-filter-icon" aria-hidden="true" />
        <input
          className="match-filter-input"
          type="text"
          placeholder="Find a fighter"
          aria-label="Find a fighter"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <Tooltip content="Clear search">
            <button className="match-filter-clear" onClick={() => setQuery('')} aria-label="Clear fighter filter">
              <X aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </div>

      {noResults && (
        <p className="empty-state" role="status">No fights found for &ldquo;{query}&rdquo;.</p>
      )}

      {live.length > 0 && (
        <section className="live-match-strip" aria-labelledby="live-now-title">
          <h2 id="live-now-title" className="section-title section-title--live">Live Now <span className="sr-only">Updates every minute</span></h2>
          <div className="match-grid" aria-live="polite">
            {live.map(m => <FightCard key={m.id} match={m} onClick={() => onSelectMatch(m)} />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="section-title">Upcoming Events</h2>
          {Object.entries(upcomingByEvent).map(([event, eventFights]) => (
            <div key={event}>
              <h3 className="date-divider">{event}</h3>
              <div className="match-grid">
                {eventFights.map(m => <FightCard key={m.id} match={m} onClick={() => onSelectMatch(m)} />)}
              </div>
            </div>
          ))}
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="section-title">Recent Events</h2>
          {Object.entries(recentByEvent).map(([event, eventFights]) => (
            <div key={event}>
              <h3 className="date-divider">{event}</h3>
              <div className="match-grid">
                {eventFights.map(m => <FightCard key={m.id} match={m} onClick={() => onSelectMatch(m)} />)}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
