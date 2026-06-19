import { useState, useEffect } from 'react'
import { useWorldCupData } from './hooks/useWorldCupData'
import Header from './components/Header'
import MatchSection from './components/MatchSection'
import Standings from './components/Standings'
import MatchModal from './components/MatchModal'
import './App.css'

const TABS = ['Matches', 'Standings']
const API_BASE = import.meta.env.VITE_API_URL || ''

export default function App() {
  const [tab, setTab] = useState('Matches')
  const [selectedMatch, setSelectedMatch] = useState(null)

  useEffect(() => {
    if (!sessionStorage.getItem('_wcd_visited')) {
      fetch(`${API_BASE}/api/analytics/visit`, { method: 'POST' }).catch(() => {})
      sessionStorage.setItem('_wcd_visited', '1')
    }
  }, [])
  const { matches, standings, loading, error, lastFetched, isLiveMode, refresh } = useWorldCupData()

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
