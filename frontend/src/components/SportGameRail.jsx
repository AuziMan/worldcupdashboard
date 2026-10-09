/* eslint-disable react/prop-types */
import { useState } from 'react'
import { SPORTS } from '@/lib/sports'
import { selectRailGames, pairText } from '@/lib/liveFeed'

function firstLiveOrFirst(order, gamesBySport) {
  return order.find(key => gamesBySport[key]?.some(g => g.isLive)) || order[0]
}

function RailCard({ game, onSelectSport }) {
  return (
    <button type="button" className="game-chip" onClick={() => onSelectSport(game.sportKey)}>
      <span className="game-chip-pair">{pairText(game)}</span>
      {game.statusText && <span className="game-chip-status">{game.statusText}</span>}
    </button>
  )
}

// Mini-card row for ONE sport at a time, switched by the bubble row below
// it. Defaults to whichever sport currently has a live game (falling back
// to tile order) only until the user picks a bubble themselves — once
// chosen, that pick is pinned for the session so the panel doesn't jump
// away mid-read if that sport's game ends.
export default function SportGameRail({ order, gamesBySport, onSelectSport, loading }) {
  const [activeSport, setActiveSport] = useState(null)
  const effectiveSport = activeSport ?? firstLiveOrFirst(order, gamesBySport)
  const games = selectRailGames(gamesBySport[effectiveSport] || [])

  return (
    <div className="sport-rail">
      <div className="sport-rail-cards">
        {loading ? (
          <span className="sport-rail-message">Loading live games&hellip;</span>
        ) : games.length > 0 ? (
          games.map(game => <RailCard key={game.id} game={game} onSelectSport={onSelectSport} />)
        ) : (
          <span className="sport-rail-message">No games today</span>
        )}
      </div>
      <div className="sport-bubbles">
        {order.map(sportKey => (
          <button
            key={sportKey}
            type="button"
            className={`sport-bubble ${effectiveSport === sportKey ? 'sport-bubble--active' : ''}`}
            style={{ '--sport-accent': SPORTS[sportKey].accent }}
            aria-pressed={effectiveSport === sportKey}
            onClick={() => setActiveSport(sportKey)}
          >
            {SPORTS[sportKey].label}
          </button>
        ))}
      </div>
    </div>
  )
}
