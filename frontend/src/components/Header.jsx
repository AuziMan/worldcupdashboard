export default function Header({ league, lastFetched, onRefresh, loading }) {
  const formatted = lastFetched
    ? lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-title">
          <img className="league-logo" src={league.logo} alt={`${league.name} logo`} />
          <div>
            <h1>{league.name}</h1>
            <p className="header-subtitle">{league.subtitle}</p>
          </div>
        </div>
        <div className="header-actions">
          {formatted && (
            <span className="last-updated">Updated {formatted}</span>
          )}
          <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>
    </header>
  )
}
