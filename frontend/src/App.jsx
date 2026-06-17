import { useState } from 'react'
import { useWorldCupData } from './hooks/useWorldCupData'
import Header from './components/Header'
import MatchSection from './components/MatchSection'
import Standings from './components/Standings'
import './App.css'

const TABS = ['Matches', 'Standings']

export default function App() {
  const [tab, setTab] = useState('Matches')
  const { matches, standings, loading, error, lastFetched, refresh } = useWorldCupData()

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
          <MatchSection matches={matches} />
        )}

        {!loading && !error && tab === 'Standings' && (
          <Standings standings={standings} />
        )}
      </main>

      <footer className="footer">
        <p>Data provided by football-data.org · Refreshes every 15 minutes (9 AM – 9 PM)</p>
      </footer>
    </div>
  )
}
