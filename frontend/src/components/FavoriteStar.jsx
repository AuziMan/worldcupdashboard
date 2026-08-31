/* eslint-disable react/prop-types */
import { Star } from 'lucide-react'
import { useFavorites } from '@/providers/FavoritesProvider'

export default function FavoriteStar({ league, team, className = '' }) {
  const { isFavorite, toggleFavorite } = useFavorites()

  if (!league || !team?.id) return null

  const active = isFavorite(league, team.id)
  const label = active
    ? `Remove ${team.name || team.shortName || 'team'} from favorites`
    : `Add ${team.name || team.shortName || 'team'} to favorites`

  return (
    <button
      type="button"
      className={`favorite-star ${active ? 'favorite-star--active' : ''} ${className}`}
      aria-label={label}
      aria-pressed={active}
      onClick={event => {
        event.preventDefault()
        event.stopPropagation()
        toggleFavorite(league, team)
      }}
    >
      <Star aria-hidden="true" fill={active ? 'currentColor' : 'none'} />
    </button>
  )
}
