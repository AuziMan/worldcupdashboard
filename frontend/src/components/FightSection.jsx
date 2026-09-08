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

const RECENT_WINDOW_DAYS = 14

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
  // Same "next 4 hours" cutoff MatchSection/RaceSection use for their
  // Starting Soon tier, so an event about to walk out doesn't get buried
  // under everything else still weeks out on the UFC calendar.
  const soonCutoff = new Date(now.getTime() + 4 * 60 * 60 * 1000)
  const startingSoon = upcoming.filter(m => new Date(m.utcDate) <= soonCutoff)
  const laterUpcoming = upcoming.filter(m => !startingSoon.includes(m))

  const allFinished = all.filter(m => m.status === 'FINISHED' && passesFilter(m)).reverse()
  const recentWindowStart = new Date(now - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  // providers/ufc.py's matches() only fetches 45 days back, so "recent" and
  // "earlier" between them still cover the whole window the backend gives
  // us — nothing older just vanishes the way it would if this only kept a
  // 14-day slice with no fallback bucket.
  const recent = allFinished.filter(m => new Date(m.utcDate) >= recentWindowStart)
  const earlier = allFinished.filter(m => new Date(m.utcDate) < recentWindowStart)

  const startingSoonByEvent = groupByEvent(startingSoon)
  const upcomingByEvent = groupByEvent(laterUpcoming)
  const recentByEvent = groupByEvent(recent)
  const earlierByEvent = groupByEvent(earlier)
  const noResults = query && live.length === 0 && upcoming.length === 0 && allFinished.length === 0

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

      {startingSoon.length > 0 && (
        <section aria-labelledby="starting-soon-title">
          <h2 id="starting-soon-title" className="section-title section-title--soon">Starting Soon <span>Next 4 hours</span></h2>
          {Object.entries(startingSoonByEvent).map(([event, eventFights]) => (
            <div key={event}>
              <h3 className="date-divider">{event}</h3>
              <div className="match-grid match-grid--soon">
                {eventFights.map(m => <FightCard key={m.id} match={m} onClick={() => onSelectMatch(m)} />)}
              </div>
            </div>
          ))}
        </section>
      )}

      {laterUpcoming.length > 0 && (
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
          <h2 className="section-title">Recent Results <span>Last two weeks</span></h2>
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

      {earlier.length > 0 && (
        <section>
          <h2 className="section-title">Earlier Results</h2>
          {Object.entries(earlierByEvent).map(([event, eventFights]) => (
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
