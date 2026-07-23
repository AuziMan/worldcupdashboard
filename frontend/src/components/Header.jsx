import { House, RefreshCw } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { Button } from './ui/Button'
import SpoilerToggle from './SpoilerToggle'

export default function Header({ league, lastFetched, onRefresh, loading, onHome }) {
  const formatted = lastFetched
    ? lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-title">
          <div className="league-logo-wrap">
            <img className="league-logo" src={league.logo} alt={`${league.name} logo`} />
          </div>
          <div className="header-copy">
            <h1>{league.name}</h1>
            <p className="header-subtitle">{league.subtitle}</p>
          </div>
        </div>
        <div className="header-actions">
          {formatted && (
            <span className="last-updated"><i /> Updated {formatted}</span>
          )}
          <Button variant="secondary" size="icon" onClick={onHome} aria-label="All sports" title="All sports">
            <House aria-hidden="true" />
          </Button>
          <SpoilerToggle />
          <ThemeToggle />
          <Button className="refresh-btn" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={loading ? 'is-spinning' : ''} aria-hidden="true" />
            <span>{loading ? 'Updating' : 'Refresh'}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
