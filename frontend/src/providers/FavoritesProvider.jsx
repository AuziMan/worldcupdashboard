/* eslint-disable react/prop-types, react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'wcd-favorite-teams'
const FavoritesContext = createContext(null)

function favoriteKey(league, teamId) {
  return `${league}:${teamId}`
}

function getInitialFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(getInitialFavorites)

  function persist(next) {
    setFavorites(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — favorites
      // just won't survive a reload; not worth surfacing to the user.
    }
  }

  // Team ids are only unique within one provider's namespace (football-data.org
  // vs ESPN vs MLB Stats API), so every lookup/toggle is scoped by league key
  // as well as team id — see FavoritesProvider notes in the favorites plan.
  function toggleFavorite(league, team) {
    if (!league || !team?.id) return
    const key = favoriteKey(league, team.id)
    const exists = favorites.some(f => f.key === key)
    if (exists) {
      persist(favorites.filter(f => f.key !== key))
    } else {
      persist([
        ...favorites,
        {
          key,
          league,
          teamId: team.id,
          name: team.name,
          shortName: team.shortName,
          crest: team.crest,
        },
      ])
    }
  }

  const favoriteKeySet = useMemo(() => new Set(favorites.map(f => f.key)), [favorites])

  function isFavorite(league, teamId) {
    if (!league || !teamId) return false
    return favoriteKeySet.has(favoriteKey(league, teamId))
  }

  const value = { favorites, favoriteKeySet, isFavorite, toggleFavorite }

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites must be used within FavoritesProvider')
  return context
}
