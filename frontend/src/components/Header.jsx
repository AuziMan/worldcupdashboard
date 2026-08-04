import { House, RefreshCw } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { Button } from './ui/Button'
import SpoilerToggle from './SpoilerToggle'
import { Tooltip } from './ui/Tooltip'

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
            <span className="last-updated" role="status"><i /> Updated {formatted}</span>
          )}
          <Tooltip content="All sports">
            <Button variant="secondary" size="icon" onClick={onHome} aria-label="Go to all sports">
              <House aria-hidden="true" />
            </Button>
          </Tooltip>
          <SpoilerToggle />
          <ThemeToggle />
          <Tooltip content="Refresh scores and standings" disabled={loading}>
            <Button className="refresh-btn" onClick={onRefresh} disabled={loading} aria-label={loading ? 'Updating match data' : 'Refresh match data'}>
              <RefreshCw className={loading ? 'is-spinning' : ''} aria-hidden="true" />
              <span>{loading ? 'Updating' : 'Refresh'}</span>
            </Button>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
