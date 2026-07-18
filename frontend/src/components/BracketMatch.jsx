function TeamRow({ team, score, isWinner }) {
  return (
    <div className={`bm-row ${isWinner ? 'bm-row--winner' : ''}`}>
      {team?.crest
        ? <img className="bm-crest" src={team.crest} alt="" />
        : <div className="bm-crest bm-crest--empty" />
      }
      <span className="bm-name">{team?.shortName || team?.name || 'TBD'}</span>
      {score !== null && score !== undefined && (
        <span className="bm-score">{score}</span>
      )}
    </div>
  )
}

import { memo } from 'react'
import { getTeamColor } from '../data/teamColors'

function BracketMatch({ match, onClick }) {
  const { homeTeam, awayTeam, score, status, utcDate } = match
  const isLive = status === 'IN_PLAY' || status === 'LIVE' || status === 'PAUSED'
  const isFinished = status === 'FINISHED' || status === 'AWARDED'
  const showScore = isLive || isFinished

  const homeScore = showScore ? (score?.fullTime?.home ?? null) : null
  const awayScore = showScore ? (score?.fullTime?.away ?? null) : null
  const homeWins = homeScore !== null && awayScore !== null && homeScore > awayScore
  const awayWins = homeScore !== null && awayScore !== null && awayScore > homeScore

  const kickoff = new Date(utcDate)
  const dateStr = kickoff.toLocaleDateString([], { month: 'short', day: 'numeric' })
  const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const homeColor = getTeamColor(homeTeam)
  const awayColor = getTeamColor(awayTeam)
  const cardStyle = {
    ...(homeColor ? { '--home-color': homeColor } : {}),
    ...(awayColor ? { '--away-color': awayColor } : {}),
  }

  return (
    <div
      className={`bm ${isLive ? 'bm--live' : ''} ${isFinished ? 'bm--finished' : ''}`}
      style={cardStyle}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
    >
      {isLive && <div className="bm-live-badge">LIVE</div>}
      <TeamRow team={homeTeam} score={homeScore} isWinner={homeWins} />
      <div className="bm-divider" />
      <TeamRow team={awayTeam} score={awayScore} isWinner={awayWins} />
      {!showScore && (
        <div className="bm-kickoff">{dateStr} · {timeStr}</div>
      )}
    </div>
  )
}

export default memo(BracketMatch)
