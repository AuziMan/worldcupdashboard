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
import FightSection from './components/FightSection'
import RankingsView from './components/RankingsView'
import { useUfcData } from './hooks/useUfcData'
import { CalendarDays, GitFork, ListOrdered, Swords, Table2, UsersRound } from 'lucide-react'
import Seo from './components/Seo'
import { SPORTS } from './lib/sports'
import './App.css'
import './styles/redesign.css'

const LEAGUES = {
  epl: {
    label: 'Premier League',
    name: 'Premier League',
    subtitle: 'England',
    logo: 'https://crests.football-data.org/PL.png',
    tabs: ['Matches', 'Teams', 'Standings'],
    attribution: 'football-data.org',
    accent: '#2563eb',
  },
  mls: {
    label: 'MLS',
    name: 'Major League Soccer',
    subtitle: 'USA · Canada',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/19.png',
    tabs: ['Matches', 'Teams', 'Standings'],
    attribution: 'ESPN',
    accent: '#00B140',
  },
  // Last in the switcher on purpose: WC 2026 finished July 19, 2026 — every
  // match is FINISHED and there's nothing upcoming until WC 2030 fixtures
  // populate under football-data.org's evergreen "WC" competition code (see
  // sports/soccer.py). Keep the tab/bracket code intact rather than removing
  // it — this comes back to life on its own once that data exists.
  wc: {
    label: 'World Cup',
    name: 'FIFA World Cup 2026',
    subtitle: '48 teams · One champion',
    logo: 'https://crests.football-data.org/wm26.png',
    tabs: ['Matches', 'Teams', 'Standings', 'Bracket'],
    attribution: 'football-data.org',
    accent: '#F5A623',
  },
}

const MLB_LEAGUE = {
  label: 'MLB',
  name: 'Major League Baseball',
  subtitle: 'USA · Canada',
  logo: SPORTS.mlb.logo,
  tabs: ['Matches', 'Teams', 'Standings'],
  attribution: 'MLB Stats API',
  accent: '#041E42',
}

const NBA_LEAGUE = {
  label: 'NBA',
  name: 'National Basketball Association',
  subtitle: 'USA · Canada',
  logo: SPORTS.nba.logo,
  tabs: ['Matches', 'Teams', 'Standings'],
  attribution: 'ESPN',
  accent: '#C8102E',
}

const NFL_LEAGUE = {
  label: 'NFL',
  name: 'National Football League',
  subtitle: 'USA',
  logo: SPORTS.nfl.logo,
  tabs: ['Matches', 'Teams', 'Standings'],
  attribution: 'ESPN',
  accent: '#013369',
}

const UFC_LEAGUE = {
  label: 'UFC',
  name: 'Ultimate Fighting Championship',
  subtitle: 'Worldwide',
  logo: SPORTS.ufc.logo,
  tabs: ['Events', 'Rankings'],
  attribution: 'ESPN',
  accent: '#D20A0A',
}

const API_BASE = import.meta.env.VITE_API_URL || ''
const TAB_ICONS = {
  Matches: CalendarDays,
  Teams: UsersRound,
  Standings: Table2,
  Bracket: GitFork,
  Events: Swords,
  Rankings: ListOrdered,
}

function SoccerDashboard({ onHome }) {
  const [league, setLeague] = useState('epl')
  const [tab, setTab] = useState('Matches')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const { matches, standings, loading, error, lastFetched, isLiveMode, refresh } = useLeagueData(league)

  const activeLeague = LEAGUES[league]
  const seoDescription = `Follow ${activeLeague.name} ${tab.toLowerCase()}, live scores, fixtures, results, teams, and standings on GAMEFOLD.`

  function selectLeague(key) {
    setLeague(key)
    if (!LEAGUES[key].tabs.includes(tab)) setTab('Matches')
  }

  return (
    <div className="app" style={{ '--league-accent': activeLeague.accent }}>
      <Seo title={`${tab} — ${activeLeague.name}`} description={seoDescription} />
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
        {activeLeague.tabs.map(t => {
          const TabIcon = TAB_ICONS[t]
          return (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'tab-btn--active' : ''}`}
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'page' : undefined}
            >
              <TabIcon aria-hidden="true" />
              {t}
            </button>
          )
        })}
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
          <MatchSection matches={matches} onSelectMatch={setSelectedMatch} league={league} />
        )}

        {!loading && !error && tab === 'Standings' && (
          <Standings standings={standings} matches={matches} highlightTop={league === 'wc'} league={league} />
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

function SingleSportDashboard({ leagueKey, config, onHome }) {
  const [tab, setTab] = useState('Matches')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const { matches, standings, loading, error, lastFetched, isLiveMode, refresh } = useLeagueData(leagueKey)

  return (
    <div className="app" style={{ '--league-accent': config.accent }}>
      <Header league={config} lastFetched={lastFetched} onRefresh={refresh} loading={loading} onHome={onHome} />

      <nav className="tab-nav">
        {config.tabs.map(t => (
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
            <p>Loading {config.name} data…</p>
          </div>
        )}

        {!loading && !error && tab === 'Matches' && (
          <MatchSection matches={matches} onSelectMatch={setSelectedMatch} showProgress={false} league={leagueKey} />
        )}

        {!loading && !error && tab === 'Standings' && (
          <Standings standings={standings} matches={matches} highlightTop={false} league={leagueKey} />
        )}

        {!loading && !error && tab === 'Teams' && (
          <TeamsView matches={matches} standings={standings} league={leagueKey} />
        )}
      </main>

      <footer className="footer">
        <p>
          Data provided by {config.attribution} ·{' '}
          Refreshes every minute (9 AM – 9 PM){isLiveMode ? ' · Live mode active' : ''}
        </p>
      </footer>

      {selectedMatch && (
        <MatchModal match={selectedMatch} league={leagueKey} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  )
}

function UfcDashboard({ onHome }) {
  const [tab, setTab] = useState('Events')
  const { matches, standings, loading, error, lastFetched, isLiveMode, refresh } = useUfcData()

  return (
    <div className="app" style={{ '--league-accent': UFC_LEAGUE.accent }}>
      <Header league={UFC_LEAGUE} lastFetched={lastFetched} onRefresh={refresh} loading={loading} onHome={onHome} />

      <nav className="tab-nav">
        {UFC_LEAGUE.tabs.map(t => {
          const TabIcon = TAB_ICONS[t]
          return (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'tab-btn--active' : ''}`}
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'page' : undefined}
            >
              <TabIcon aria-hidden="true" />
              {t}
            </button>
          )
        })}
      </nav>

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <strong>Having trouble loading fight data.</strong>
            <p>The server may be waking up — please wait a moment and try refreshing.</p>
          </div>
        )}

        {loading && !matches && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading {UFC_LEAGUE.name} data…</p>
          </div>
        )}

        {!loading && !error && tab === 'Events' && (
          <FightSection matches={matches} onSelectMatch={() => {}} />
        )}

        {!loading && !error && tab === 'Rankings' && (
          <RankingsView standings={standings} />
        )}
      </main>

      <footer className="footer">
        <p>
          Data provided by {UFC_LEAGUE.attribution} ·{' '}
          Refreshes every minute (9 AM – 9 PM){isLiveMode ? ' · Live mode active' : ''}
        </p>
      </footer>
    </div>
  )
}

function sportFromHash() {
  const value = window.location.hash.slice(1)
  return ['soccer', 'mlb', 'nba', 'nfl', 'ufc'].includes(value) ? value : null
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

  if (isAdmin) return <><Seo title="Admin | GAMEFOLD" robots="noindex, nofollow" /><AdminPanel /></>
  if (!sport) return <><Seo title="GAMEFOLD — Live Sports Scores, Fixtures & Standings" /><HomePage onSelectSport={selectSport} /></>
  if (sport === 'soccer') return <SoccerDashboard onHome={goHome} />
  if (sport === 'mlb') return <SingleSportDashboard leagueKey="mlb" config={MLB_LEAGUE} onHome={goHome} />
  if (sport === 'nba') return <SingleSportDashboard leagueKey="nba" config={NBA_LEAGUE} onHome={goHome} />
  if (sport === 'nfl') return <SingleSportDashboard leagueKey="nfl" config={NFL_LEAGUE} onHome={goHome} />
  if (sport === 'ufc') return <UfcDashboard onHome={goHome} />
  return (
    <>
      <Seo title={`${sport.toUpperCase()} Scores — Coming Soon`} description={`${sport.toUpperCase()} scores, schedules, standings, and postseason coverage are coming to GAMEFOLD.`} />
      <ComingSoonPage sport={sport} onHome={goHome} />
    </>
  )
}
