/* eslint-disable react/prop-types, react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'

const STORAGE_KEY = 'wcd-spoiler-free'
const SpoilerContext = createContext(null)

function getInitialPreference() {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function SpoilerProvider({ children }) {
  const [spoilerFree, setSpoilerFreeState] = useState(getInitialPreference)
  const [revealedMatches, setRevealedMatches] = useState(() => new Set())

  function setSpoilerFree(value) {
    setSpoilerFreeState(value)
    localStorage.setItem(STORAGE_KEY, String(value))
    if (!value) setRevealedMatches(new Set())
  }

  function revealMatch(matchId) {
    setRevealedMatches(current => new Set(current).add(String(matchId)))
  }

  function isScoreHidden(match) {
    const isComplete = match?.status === 'FINISHED' || match?.status === 'AWARDED'
    return spoilerFree && isComplete && !revealedMatches.has(String(match?.id))
  }

  const value = { spoilerFree, setSpoilerFree, revealMatch, isScoreHidden }

  return <SpoilerContext.Provider value={value}>{children}</SpoilerContext.Provider>
}

export function useSpoilers() {
  const context = useContext(SpoilerContext)
  if (!context) throw new Error('useSpoilers must be used within SpoilerProvider')
  return context
}
