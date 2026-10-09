/* eslint-disable react/prop-types */
import { useState } from 'react'
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import BrandMark from './BrandMark'
import LiveTicker from './LiveTicker'
import LiveWheel from './LiveWheel'
import SportGameRail from './SportGameRail'
import { SPORTS } from '@/lib/sports'
import { useSportOrder } from '@/hooks/useSportOrder'
import { useLiveFeed } from '@/hooks/useLiveFeed'
import { selectFeatured, selectWheelGames, formatHeadline } from '@/lib/liveFeed'
import { Tooltip } from './ui/Tooltip'

const SPORT_KEYS = Object.keys(SPORTS)

function SportTile({ sportKey, sport, headline, index, count, reordering, onSelect, onMoveEarlier, onMoveLater }) {
  const comingSoon = sport.detail === 'Coming soon'

  function activate() {
    if (reordering || comingSoon) return
    onSelect(sportKey)
  }

  const tile = (
    <div
      className={`sport-tile ${reordering ? 'sport-tile--reordering' : ''} ${comingSoon ? 'sport-tile--disabled' : ''}`}
      role={reordering ? undefined : 'button'}
      tabIndex={reordering ? undefined : 0}
      aria-disabled={comingSoon || undefined}
      onClick={activate}
      onKeyDown={e => {
        if (!reordering && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          activate()
        }
      }}
    >
      {reordering && (
        <div className="sport-tile-reorder">
          <button
            type="button"
            className="sport-tile-move"
            aria-label={`Move ${sport.label} earlier`}
            disabled={index === 0}
            onClick={e => {
              e.stopPropagation()
              onMoveEarlier(sportKey)
            }}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sport-tile-move"
            aria-label={`Move ${sport.label} later`}
            disabled={index === count - 1}
            onClick={e => {
              e.stopPropagation()
              onMoveLater(sportKey)
            }}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
      <img src={sport.logo} alt={`${sport.label} logo`} />
      <span className="sport-tile-name">{sport.label}</span>
      <span className="sport-tile-status">{headline || sport.detail}</span>
    </div>
  )

  if (reordering) return tile

  return (
    <Tooltip content={comingSoon ? `${sport.label} is coming soon` : `Open ${sport.label}`} side="bottom">
      {tile}
    </Tooltip>
  )
}

export default function HomePage({ onSelectSport }) {
  const [reordering, setReordering] = useState(false)
  const { order, moveEarlier, moveLater } = useSportOrder(SPORT_KEYS)
  const { games, gamesBySport, loading, error } = useLiveFeed()

  return (
    <main className="welcome">
      <header className="welcome-nav">
        <a className="welcome-brand" href="#home" aria-label="GAMEFOLD home">
          <BrandMark className="welcome-brand-mark" />
          <span>GAMEFOLD</span>
        </a>
        <div className="welcome-nav-actions">
          <Tooltip content={reordering ? 'Done reordering' : 'Reorder sports'} side="bottom">
            <button
              type="button"
              className={`welcome-reorder-toggle ${reordering ? 'welcome-reorder-toggle--active' : ''}`}
              aria-pressed={reordering}
              aria-label={reordering ? 'Done reordering sports' : 'Reorder sports'}
              onClick={() => setReordering(v => !v)}
            >
              {reordering ? <Check aria-hidden="true" /> : <ArrowLeftRight aria-hidden="true" />}
            </button>
          </Tooltip>
          <ThemeToggle />
        </div>
      </header>

      <section className="welcome-content">
        <LiveTicker order={order} gamesBySport={gamesBySport} onSelectSport={onSelectSport} loading={loading} />

        <LiveWheel games={selectWheelGames(games)} onSelectSport={onSelectSport} loading={loading} error={error} />

        <SportGameRail order={order} gamesBySport={gamesBySport} onSelectSport={onSelectSport} loading={loading} />

        <div className="sport-grid" aria-label="Choose a sport">
          {order.map((key, i) => (
            <SportTile
              key={key}
              sportKey={key}
              sport={SPORTS[key]}
              headline={loading ? null : formatHeadline(selectFeatured(gamesBySport[key]))}
              index={i}
              count={order.length}
              reordering={reordering}
              onSelect={onSelectSport}
              onMoveEarlier={moveEarlier}
              onMoveLater={moveLater}
            />
          ))}
        </div>
      </section>

      <footer className="welcome-footer">
        <span>Live data. Zero noise.</span>
        <span>2026</span>
      </footer>
    </main>
  )
}
