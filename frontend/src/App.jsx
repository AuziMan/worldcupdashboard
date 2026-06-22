import { useState, useEffect } from 'react'
import { useWorldCupData } from './hooks/useWorldCupData'
import Header from './components/Header'
import MatchSection from './components/MatchSection'
import Standings from './components/Standings'
import MatchModal from './components/MatchModal'
import AdminPanel from './components/AdminPanel'
import BracketView from './components/BracketView'
import './App.css'

const TABS = ['Matches', 'Standings', 'Bracket']
const API_BASE = import.meta.env.VITE_API_URL || ''

export default function App() {
  const [tab, setTab] = useState('Matches')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const isAdmin = window.location.hash === '#admin'

  useEffect(() => {
    if (!isAdmin && !sessionStorage.getItem('_wcd_visited')) {
      fetch(`${API_BASE}/api/analytics/visit`, { method: 'POST' }).catch(() => {})
      sessionStorage.setItem('_wcd_visited', '1')
    }
  }, [isAdmin])
  const { matches, standings, loading, error, lastFetched, isLiveMode, refresh } = useWorldCupData()

  if (isAdmin) return <AdminPanel />

  return (
    <div className="app">
      <Header lastFetched={lastFetched} onRefresh={refresh} loading={loading} />

      <nav className="tab-nav">
        {TABS.map(t => (
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
            <strong>Could not load data:</strong> {error}
            {error.includes('401') && (
              <p>Check that your <code>FOOTBALL_DATA_API_KEY</code> is set in <code>backend/.env</code>.</p>
            )}
          </div>
        )}

        {loading && !matches && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading World Cup data…</p>
          </div>
        )}

        {!loading && !error && tab === 'Matches' && (
          <MatchSection matches={matches} onSelectMatch={setSelectedMatch} />
        )}

        {!loading && !error && tab === 'Standings' && (
          <Standings standings={standings} />
        )}

        {!loading && !error && tab === 'Bracket' && (
          <BracketView matches={matches} onSelectMatch={setSelectedMatch} />
        )}
      </main>

      <footer className="footer">
        <p>
          Data provided by football-data.org ·{' '}
          Refreshes every minute (9 AM – 9 PM){isLiveMode ? ' · Live mode active' : ''}
        </p>
      </footer>

      {selectedMatch && (
        <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  )
}
