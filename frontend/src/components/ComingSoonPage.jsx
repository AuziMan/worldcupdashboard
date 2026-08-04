import { House } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { SPORTS } from '@/lib/sports'
import { Tooltip } from './ui/Tooltip'

const SPORT_COPY = {
  mlb: {
    label: 'MLB',
    title: 'Baseball is on deck.',
    description: 'Scores, schedules, standings, and postseason coverage are coming here next.',
  },
  nba: {
    label: 'NBA',
    title: 'Basketball is warming up.',
    description: 'Live games, conference standings, and playoff coverage are coming here next.',
  },
}

// eslint-disable-next-line react/prop-types
export default function ComingSoonPage({ sport, onHome }) {
  const content = SPORT_COPY[sport]
  const sportLogo = SPORTS[sport].logo

  return (
    <main className="coming-soon">
      <header className="coming-soon-nav">
        <Tooltip content="Return to sport selection" side="bottom">
          <button className="back-button" onClick={onHome}>
            <House aria-hidden="true" />
            Sports home
          </button>
        </Tooltip>
        <ThemeToggle />
      </header>

      <section className="coming-soon-content">
        <div className="coming-soon-icon">
          <img src={sportLogo} alt={`${content.label} logo`} />
        </div>
        <p>{content.label}</p>
        <h1>{content.title}</h1>
        <span>{content.description}</span>
      </section>
    </main>
  )
}
