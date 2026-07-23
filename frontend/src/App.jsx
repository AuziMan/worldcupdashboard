import { useState, useEffect } from 'react'
import { useLeagueData } from './hooks/useLeagueData'
import Header from './components/Header'
import MatchSection from './components/MatchSection'
import Standings from './components/Standings'
import MatchModal from './components/MatchModal'
import AdminPanel from './components/AdminPanel'
import BracketView from './components/BracketView'
import HomePage from './components/HomePage'
import ComingSoonPage from './components/ComingSoonPage'
import TeamsView from './components/TeamsView'
import './App.css'
import './styles/redesign.css'

const LEAGUES = {
  wc: {
    label: 'World Cup',
    name: 'FIFA World Cup 2026',
    subtitle: 'USA · Canada · Mexico',
    logo: 'https://crests.football-data.org/wm26.png',
    tabs: ['Matches', 'Teams', 'Standings', 'Bracket'],
    attribution: 'football-data.org',
  },
  epl: {
    label: 'Premier League',
    name: 'Premier League',
    subtitle: 'England',
    logo: 'https://crests.football-data.org/PL.png',
    tabs: ['Matches', 'Teams', 'Standings'],
    attribution: 'football-data.org',
  },
  mls: {
    label: 'MLS',
    name: 'Major League Soccer',
    subtitle: 'USA · Canada',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/19.png',
    tabs: ['Matches', 'Teams', 'Standings'],
    attribution: 'ESPN',
  },
}

const API_BASE = import.meta.env.VITE_API_URL || ''

function SoccerDashboard({ onHome }) {
  const [league, setLeague] = useState('wc')
  const [tab, setTab] = useState('Matches')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const { matches, standings, loading, error, lastFetched, isLiveMode, refresh } = useLeagueData(league)

  const activeLeague = LEAGUES[league]

  function selectLeague(key) {
    setLeague(key)
    if (!LEAGUES[key].tabs.includes(tab)) setTab('Matches')
  }

  return (
    <div className="app">
      <Header league={activeLeague} lastFetched={lastFetched} onRefresh={refresh} loading={loading} onHome={onHome} />

      <nav className="tab-nav league-nav">
        {Object.entries(LEAGUES).map(([key, l]) => (
          <button
            key={key}
            className={`tab-btn ${league === key ? 'tab-btn--active' : ''}`}
            onClick={() => selectLeague(key)}
            aria-pressed={league === key}
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
            aria-current={tab === t ? 'page' : undefined}
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

        {!loading && !error && tab === 'Teams' && (
          <TeamsView matches={matches} standings={standings} league={league} />
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

function sportFromHash() {
  const value = window.location.hash.slice(1)
  return ['soccer', 'mlb', 'nba'].includes(value) ? value : null
}

export default function App() {
  const isAdmin = window.location.hash === '#admin'
  const [sport, setSport] = useState(sportFromHash)

  useEffect(() => {
    if (!isAdmin && !sessionStorage.getItem('_wcd_visited')) {
      fetch(`${API_BASE}/api/analytics/visit`, { method: 'POST' }).catch(() => {})
      sessionStorage.setItem('_wcd_visited', '1')
    }
  }, [isAdmin])

  useEffect(() => {
    const handleHashChange = () => setSport(sportFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function selectSport(nextSport) {
    setSport(nextSport)
    window.location.hash = nextSport
  }

  function goHome() {
    setSport(null)
    window.location.hash = 'home'
  }

  if (isAdmin) return <AdminPanel />
  if (!sport) return <HomePage onSelectSport={selectSport} />
  if (sport === 'soccer') return <SoccerDashboard onHome={goHome} />
  return <ComingSoonPage sport={sport} onHome={goHome} />
}
