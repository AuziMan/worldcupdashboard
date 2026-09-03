import { useState } from 'react'
import { Search, X } from 'lucide-react'
import SessionCard from './SessionCard'
import { Tooltip } from './ui/Tooltip'

// Driver-level search isn't possible here anymore — the schedule list is
// intentionally lightweight (no eagerly-fetched driver/result data, see
// providers/openf1.py's docstring), so this only matches weekend/session text.
function matchesQuery(session, query) {
  const q = query.toLowerCase()
  return (
    session.meetingName?.toLowerCase().includes(q) ||
    session.location?.toLowerCase().includes(q) ||
    session.country?.toLowerCase().includes(q) ||
    session.session?.toLowerCase().includes(q)
  )
}

function groupByMeeting(sessions) {
  const groups = new Map()
  for (const s of sessions) {
    if (!groups.has(s.meetingKey)) {
      groups.set(s.meetingKey, {
        meetingKey: s.meetingKey,
        meetingName: s.meetingName,
        location: s.location,
        country: s.country,
        countryFlag: s.countryFlag,
        sessions: [],
      })
    }
    groups.get(s.meetingKey).sessions.push(s)
  }
  for (const group of groups.values()) {
    group.sessions.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
  }
  return [...groups.values()]
}

function meetingStatus(group) {
  if (group.sessions.some(s => s.status === 'IN_PLAY')) return 'live'
  if (group.sessions.every(s => s.status === 'FINISHED' || s.status === 'CANCELLED')) return 'finished'
  return 'upcoming'
}

function meetingEndDate(group) {
  return new Date(Math.max(...group.sessions.map(s => new Date(s.utcDate))))
}

function MeetingGroup({ group, onSelectMatch }) {
  return (
    <div className="meeting-group">
      <h3 className="date-divider meeting-group-title">
        {group.countryFlag && <img className="meeting-group-flag" src={group.countryFlag} alt="" />}
        {group.meetingName}
        {group.location && <span className="meeting-group-location">{group.location}</span>}
      </h3>
      <div className="match-grid session-grid">
        {group.sessions.map(s => (
          <SessionCard key={s.id} match={s} onClick={() => onSelectMatch(s)} />
        ))}
      </div>
    </div>
  )
}

const RECENT_WINDOW_DAYS = 14

export default function RaceSection({ matches, onSelectMatch }) {
  const [query, setQuery] = useState('')

  if (!matches?.matches?.length) {
    return <p className="empty-state">No races to show right now. Check back soon!</p>
  }

  const passesFilter = query ? s => matchesQuery(s, query) : () => true
  const filtered = matches.matches.filter(passesFilter)
  const groups = groupByMeeting(filtered)

  const live = groups.filter(g => meetingStatus(g) === 'live')
  const upcoming = groups
    .filter(g => meetingStatus(g) === 'upcoming')
    .sort((a, b) => meetingEndDate(a) - meetingEndDate(b))

  const finished = groups.filter(g => meetingStatus(g) === 'finished')
  const now = new Date()
  const recentWindowStart = new Date(now - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const recent = finished
    .filter(g => meetingEndDate(g) >= recentWindowStart)
    .sort((a, b) => meetingEndDate(b) - meetingEndDate(a))
  const earlier = finished
    .filter(g => meetingEndDate(g) < recentWindowStart)
    .sort((a, b) => meetingEndDate(b) - meetingEndDate(a))

  const noResults = query && groups.length === 0

  return (
    <div className="match-section">
      <div className="match-filter">
        <Search className="match-filter-icon" aria-hidden="true" />
        <input
          className="match-filter-input"
          type="text"
          placeholder="Find a Grand Prix"
          aria-label="Find a Grand Prix"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <Tooltip content="Clear search">
            <button className="match-filter-clear" onClick={() => setQuery('')} aria-label="Clear search">
              <X aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </div>

      {noResults && (
        <p className="empty-state" role="status">No races found for &ldquo;{query}&rdquo;.</p>
      )}

      {live.length > 0 && (
        <section className="live-match-strip" aria-labelledby="live-now-title">
          <h2 id="live-now-title" className="section-title section-title--live">Live Now <span className="sr-only">Updates every minute</span></h2>
          {live.map(g => <MeetingGroup key={g.meetingKey} group={g} onSelectMatch={onSelectMatch} />)}
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="section-title">Upcoming Race Weekends</h2>
          {upcoming.map(g => <MeetingGroup key={g.meetingKey} group={g} onSelectMatch={onSelectMatch} />)}
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="section-title">Recent Results <span>Last two weeks</span></h2>
          {recent.map(g => <MeetingGroup key={g.meetingKey} group={g} onSelectMatch={onSelectMatch} />)}
        </section>
      )}

      {earlier.length > 0 && (
        <section>
          <h2 className="section-title">Earlier This Season</h2>
          {earlier.map(g => <MeetingGroup key={g.meetingKey} group={g} onSelectMatch={onSelectMatch} />)}
        </section>
      )}
    </div>
  )
}
