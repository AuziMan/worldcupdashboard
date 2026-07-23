import { Trophy } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { SPORTS } from '@/lib/sports'

// eslint-disable-next-line react/prop-types
export default function HomePage({ onSelectSport }) {
  return (
    <main className="welcome">
      <header className="welcome-nav">
        <a className="welcome-brand" href="#home" aria-label="Sports dashboard home">
          <span className="welcome-brand-mark"><Trophy aria-hidden="true" /></span>
          <span>Fieldhouse</span>
        </a>
        <ThemeToggle />
      </header>

      <section className="welcome-content">
        <p className="welcome-eyebrow">One place. Every game.</p>
        <h1>Choose your<br />arena.</h1>
        <p className="welcome-intro">
          Scores, standings, and the moments that matter—built for the way you follow sports.
        </p>

        <div className="welcome-sport-logos" aria-label="Choose a sport">
          {Object.entries(SPORTS).map(([key, sport]) => (
            <button
              className="welcome-sport-logo"
              key={key}
              onClick={() => onSelectSport(key)}
              aria-label={`Open ${sport.label}${sport.detail === 'Coming soon' ? ', coming soon' : ''}`}
            >
              <img src={sport.logo} alt={`${sport.label} logo`} />
              <span>{sport.label}</span>
              <small>{sport.detail}</small>
            </button>
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
