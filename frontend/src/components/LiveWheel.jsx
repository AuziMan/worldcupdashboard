/* eslint-disable react/prop-types */
import { SPORTS } from '@/lib/sports'
import { pairText } from '@/lib/liveFeed'

function WheelCard({ game, onSelectSport }) {
  const sport = SPORTS[game.sportKey]
  return (
    <button
      type="button"
      className="live-wheel-card"
      style={{ '--sport-accent': sport.accent }}
      onClick={() => onSelectSport(game.sportKey)}
    >
      <span className="live-wheel-sport">
        {sport.label}
        {game.isLive ? ' · LIVE' : ''}
      </span>
      <span className="live-wheel-pair">{pairText(game)}</span>
      {game.statusText && <span className="live-wheel-status">{game.statusText}</span>}
    </button>
  )
}

// One card per game (not per sport) across every sport combined — every
// currently-live game, or the next several upcoming ones if nothing's live
// anywhere. See lib/liveFeed.js's selectWheelGames for that fallback logic.
export default function LiveWheel({ games, onSelectSport, loading, error }) {
  if (loading) {
    return <div className="live-wheel live-wheel--empty">Loading live games&hellip;</div>
  }
  if (error) {
    return <div className="live-wheel live-wheel--empty">Live data unavailable</div>
  }
  if (!games || games.length === 0) {
    return null
  }

  return (
    <div className="live-wheel">
      <div className="live-wheel-track">
        {games.map(game => (
          <WheelCard key={`a-${game.id}`} game={game} onSelectSport={onSelectSport} />
        ))}
        {games.map(game => (
          <WheelCard key={`b-${game.id}`} game={game} onSelectSport={onSelectSport} />
        ))}
      </div>
    </div>
  )
}
