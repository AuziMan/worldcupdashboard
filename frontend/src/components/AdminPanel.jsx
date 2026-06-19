import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function AdminPanel() {
  const [token, setToken] = useState('')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function fetchStats(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/analytics`, {
        headers: { 'X-Refresh-Token': token },
      })
      if (!res.ok) throw new Error('Invalid token or server error')
      setStats(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-panel">
      <h2 className="admin-title">Analytics</h2>

      {!stats && (
        <form className="admin-form" onSubmit={fetchStats}>
          <input
            className="admin-input"
            type="password"
            placeholder="Enter your refresh secret"
            value={token}
            onChange={e => setToken(e.target.value)}
            autoFocus
          />
          <button className="admin-submit" type="submit" disabled={loading || !token}>
            {loading ? 'Loading…' : 'View Stats'}
          </button>
          {error && <p className="admin-error">{error}</p>}
        </form>
      )}

      {stats && (
        <div className="admin-stats">
          <div className="admin-stat-row">
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.today_unique_visitors}</div>
              <div className="admin-stat-label">Unique visitors today</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.today_visits}</div>
              <div className="admin-stat-label">Page loads today</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.total_visits.toLocaleString()}</div>
              <div className="admin-stat-label">Total visits (all time)</div>
            </div>
          </div>

          <h3 className="admin-section-title">Last 7 Days</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Unique Visitors</th>
                  <th>Page Loads</th>
                </tr>
              </thead>
              <tbody>
                {stats.last_7_days.map(d => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td>{d.unique_visitors}</td>
                    <td>{d.visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="admin-reset"
            onClick={() => { setStats(null); setToken('') }}
          >
            Lock
          </button>
        </div>
      )}
    </div>
  )
}
