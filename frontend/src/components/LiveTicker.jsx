/* eslint-disable react/prop-types */
import { SPORTS } from '@/lib/sports'
import { selectFeatured, formatHeadline } from '@/lib/liveFeed'

// Replaces the old static "Choose your arena" headline that used to live in
// this same .welcome-ticker strip — one compact, always-scrolling line per
// sport instead, each showing that sport's single most relevant game.
export default function LiveTicker({ order, gamesBySport, onSelectSport, loading }) {
  if (loading) {
    return (
      <div className="welcome-ticker">
        <div className="welcome-ticker-loading">Loading live games&hellip;</div>
      </div>
    )
  }

  const lines = order.map(sportKey => ({
    sportKey,
    sport: SPORTS[sportKey],
    headline: formatHeadline(selectFeatured(gamesBySport[sportKey])),
  }))

  if (lines.length === 0) return null

  return (
    <div className="welcome-ticker">
      <div className="welcome-ticker-track">
        {['a', 'b'].map(copy =>
          lines.map(({ sportKey, sport, headline }) => (
            <button
              key={`${copy}-${sportKey}`}
              type="button"
              className="welcome-ticker-item"
              style={{ '--sport-accent': sport.accent }}
              onClick={() => onSelectSport(sportKey)}
            >
              <span className="welcome-ticker-sport">{sport.label}</span>
              <span className="welcome-ticker-headline">{headline}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
