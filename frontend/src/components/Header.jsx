export default function Header({ lastFetched, onRefresh, loading }) {
  const formatted = lastFetched
    ? lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-title">
          <span className="trophy">🏆</span>
          <div>
            <h1>FIFA World Cup 2026</h1>
            <p className="header-subtitle">USA · Canada · Mexico</p>
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
