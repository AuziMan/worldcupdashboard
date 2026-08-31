import { useState } from 'react'
import { Search, X } from 'lucide-react'
import MatchCard from './MatchCard'
import { Tooltip } from './ui/Tooltip'
import { useFavorites } from '@/providers/FavoritesProvider'

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

// Favorite-involving matches first, stable otherwise (JS array sort is
// stable, so non-favorite matches keep their existing relative order).
function favoritesFirst(list, isFavMatch) {
  return [...list].sort((a, b) => Number(isFavMatch(b)) - Number(isFavMatch(a)))
}

const RECENT_WINDOW_DAYS = 14

export default function MatchSection({ matches, onSelectMatch, showProgress = true, league }) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState('upcoming')
  const { favoriteKeySet } = useFavorites()

  if (!matches?.matches?.length) {
    return <p className="empty-state">No matches to show right now. Check back soon!</p>
  }

  const isFavMatch = m =>
    favoriteKeySet.has(`${league}:${m.homeTeam?.id}`) || favoriteKeySet.has(`${league}:${m.awayTeam?.id}`)

  const all = matches.matches
  const now = new Date()
  const hasTeams = m => m.homeTeam?.name && m.awayTeam?.name
  const passesFilter = query
    ? m => hasTeams(m) && matchesTeam(m, query)
    : hasTeams

  const live = favoritesFirst(all.filter(m =>
    (m.status === 'IN_PLAY' || m.status === 'LIVE' || m.status === 'PAUSED' || m.status === 'SUSPENDED') &&
    passesFilter(m)
  ), isFavMatch)
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000)
  const upcoming = all
    .filter(m => (m.status === 'SCHEDULED' || m.status === 'TIMED') && passesFilter(m))
    .filter(m => new Date(m.utcDate) >= twoHoursAgo)
  const soonCutoff = new Date(now.getTime() + 4 * 60 * 60 * 1000)
  const startingSoon = favoritesFirst(upcoming.filter(m => {
    const kickoff = new Date(m.utcDate)
    return kickoff >= now && kickoff <= soonCutoff
  }), isFavMatch)
  const laterUpcoming = favoritesFirst(upcoming.filter(m => !startingSoon.includes(m)), isFavMatch)

  const allFinished = all.filter(m => m.status === 'FINISHED' && passesFilter(m)).reverse()
  const recentWindowStart = new Date(now - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  // "Live/Upcoming" tab only teases the last two weeks of results — the full
  // history lives in the "Past" tab so this view doesn't get swamped by a
  // busy league's entire finished schedule (e.g. 100+ MLS results).
  const recent = favoritesFirst(
    allFinished.filter(m => new Date(m.utcDate) >= recentWindowStart),
    isFavMatch
  )
  const past = favoritesFirst(allFinished, isFavMatch)

  const upcomingByDate = groupByDate(laterUpcoming)
  const pastByDate = groupByDate(past)

  const upcomingNoResults = query && live.length === 0 && upcoming.length === 0 && recent.length === 0
  const pastNoResults = query && past.length === 0

  return (
    <div className="match-section">
      <nav className="tab-nav match-section-tabs" aria-label="Match timeframe">
        <button
          className={`tab-btn ${view === 'upcoming' ? 'tab-btn--active' : ''}`}
          onClick={() => setView('upcoming')}
          aria-current={view === 'upcoming' ? 'page' : undefined}
        >
          Live/Upcoming
        </button>
        <button
          className={`tab-btn ${view === 'past' ? 'tab-btn--active' : ''}`}
          onClick={() => setView('past')}
          aria-current={view === 'past' ? 'page' : undefined}
        >
          Past{allFinished.length > 0 ? ` (${allFinished.length})` : ''}
        </button>
      </nav>

      <div className="match-filter">
        <Search className="match-filter-icon" aria-hidden="true" />
        <input
          className="match-filter-input"
          type="text"
          placeholder="Find a team"
          aria-label="Find a team"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <Tooltip content="Clear search">
            <button className="match-filter-clear" onClick={() => setQuery('')} aria-label="Clear team filter">
              <X aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </div>

      {view === 'upcoming' && (
        <>
          {upcomingNoResults && (
            <p className="empty-state" role="status">No matches found for &ldquo;{query}&rdquo;.</p>
          )}

          {live.length > 0 && (
            <section className="live-match-strip" aria-labelledby="live-now-title">
              <h2 id="live-now-title" className="section-title section-title--live">Live Now <span className="sr-only">Updates every minute</span></h2>
              <div className="match-grid" aria-live="polite">
                {live.map(m => <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m)} league={league} />)}
              </div>
            </section>
          )}

          {startingSoon.length > 0 && (
            <section aria-labelledby="starting-soon-title">
              <h2 id="starting-soon-title" className="section-title section-title--soon">Starting Soon <span>Next 4 hours</span></h2>
              <div className="match-grid match-grid--soon">
                {startingSoon.map(m => <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m)} league={league} />)}
              </div>
            </section>
          )}

          {laterUpcoming.length > 0 && (
            <section>
              <h2 className="section-title">Upcoming Matches</h2>
              {Object.entries(upcomingByDate).map(([date, dayMatches]) => (
                <div key={date}>
                  <h3 className={`date-divider${date === todayLabel ? ' date-divider--today' : ''}`}>{date}</h3>
                  <div className="match-grid">
                    {dayMatches.map(m => <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m)} showProgress={showProgress} league={league} />)}
                  </div>
                </div>
              ))}
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <h2 className="section-title">Recent Results <span>Last two weeks</span></h2>
              <div className="match-grid">
                {recent.map(m => <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m)} showProgress={showProgress} league={league} />)}
              </div>
            </section>
          )}
        </>
      )}

      {view === 'past' && (
        <>
          {pastNoResults && (
            <p className="empty-state" role="status">No past matches found for &ldquo;{query}&rdquo;.</p>
          )}

          {!pastNoResults && past.length === 0 && (
            <p className="empty-state">No past matches yet.</p>
          )}

          {Object.entries(pastByDate).map(([date, dayMatches]) => (
            <section key={date}>
              <h3 className={`date-divider${date === todayLabel ? ' date-divider--today' : ''}`}>{date}</h3>
              <div className="match-grid">
                {dayMatches.map(m => <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m)} showProgress={showProgress} league={league} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
