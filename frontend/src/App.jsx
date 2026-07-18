import { useState, useEffect } from 'react'
import { useLeagueData } from './hooks/useLeagueData'
import Header from './components/Header'
import MatchSection from './components/MatchSection'
import Standings from './components/Standings'
import MatchModal from './components/MatchModal'
import AdminPanel from './components/AdminPanel'
import BracketView from './components/BracketView'
import './App.css'

const LEAGUES = {
  wc: {
    label: 'World Cup',
    name: 'FIFA World Cup 2026',
    subtitle: 'USA · Canada · Mexico',
    logo: 'https://crests.football-data.org/wm26.png',
    tabs: ['Matches', 'Standings', 'Bracket'],
    attribution: 'football-data.org',
    accent: '#F5A623',
  },
  epl: {
    label: 'Premier League',
    name: 'Premier League',
    subtitle: 'England',
    logo: 'https://crests.football-data.org/PL.png',
    tabs: ['Matches', 'Standings'],
    attribution: 'football-data.org',
    accent: '#2563eb',
  },
  mls: {
    label: 'MLS',
    name: 'Major League Soccer',
    subtitle: 'USA · Canada',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/19.png',
    tabs: ['Matches', 'Standings'],
    attribution: 'ESPN',
    accent: '#00B140',
  },
}

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function App() {
  const [league, setLeague] = useState('wc')
  const [tab, setTab] = useState('Matches')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const isAdmin = window.location.hash === '#admin'

  useEffect(() => {
    if (!isAdmin && !sessionStorage.getItem('_wcd_visited')) {
      fetch(`${API_BASE}/api/analytics/visit`, { method: 'POST' }).catch(() => {})
      sessionStorage.setItem('_wcd_visited', '1')
    }
  }, [isAdmin])
  const { matches, standings, loading, error, lastFetched, isLiveMode, refresh } = useLeagueData(league)

  if (isAdmin) return <AdminPanel />

  const activeLeague = LEAGUES[league]

  function selectLeague(key) {
    setLeague(key)
    if (!LEAGUES[key].tabs.includes(tab)) setTab('Matches')
  }

  return (
    <div className="app" style={{ '--league-accent': activeLeague.accent }}>
      <Header league={activeLeague} lastFetched={lastFetched} onRefresh={refresh} loading={loading} />

      <nav className="tab-nav league-nav">
        {Object.entries(LEAGUES).map(([key, l]) => (
          <button
            key={key}
            className={`tab-btn ${league === key ? 'tab-btn--active' : ''}`}
            onClick={() => selectLeague(key)}
          >
            {l.label}
          </button>
        ))}
      </nav>

      <nav className="tab-nav">
        {activeLeague.tabs.map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'tab-btn--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <strong>Having trouble loading match data.</strong>
            <p>The server may be waking up — please wait a moment and try refreshing.</p>
          </div>
        )}

        {loading && !matches && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading {activeLeague.name} data…</p>
          </div>
        )}

        {!loading && !error && tab === 'Matches' && (
          <MatchSection matches={matches} onSelectMatch={setSelectedMatch} />
        )}

        {!loading && !error && tab === 'Standings' && (
          <Standings standings={standings} matches={matches} highlightTop={league === 'wc'} />
        )}

        {!loading && !error && tab === 'Bracket' && (
          <BracketView matches={matches} onSelectMatch={setSelectedMatch} />
        )}
      </main>

      <footer className="footer">
        <p>
          Data provided by {activeLeague.attribution} ·{' '}
          Refreshes every minute (9 AM – 9 PM){isLiveMode ? ' · Live mode active' : ''}
        </p>
      </footer>

      {selectedMatch && (
        <MatchModal match={selectedMatch} league={league} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  )
}
