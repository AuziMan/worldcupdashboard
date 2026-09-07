import { useCallback, useEffect, useState } from 'react'

// localStorage-backed sport tile order for the homepage grid — same
// client-only/per-device pattern as FavoritesProvider (see project memory),
// just without a shared context since only HomePage needs it.
const STORAGE_KEY = 'gamefold-sport-order'

function loadOrder(defaultKeys) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored = raw ? JSON.parse(raw) : null
    if (!Array.isArray(stored)) return defaultKeys

    // Reconcile against the current SPORTS registry: drop keys that no
    // longer exist, append any new ones (e.g. a sport added after the
    // user last customized their order) at the end.
    const known = new Set(defaultKeys)
    const kept = stored.filter(key => known.has(key))
    const missing = defaultKeys.filter(key => !kept.includes(key))
    return [...kept, ...missing]
  } catch {
    return defaultKeys
  }
}

export function useSportOrder(defaultKeys) {
  const [order, setOrder] = useState(() => loadOrder(defaultKeys))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — the custom
      // order just won't survive a reload; not worth surfacing to the user.
    }
  }, [order])

  const moveEarlier = useCallback(key => {
    setOrder(prev => {
      const i = prev.indexOf(key)
      if (i <= 0) return prev
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }, [])

  const moveLater = useCallback(key => {
    setOrder(prev => {
      const i = prev.indexOf(key)
      if (i === -1 || i >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
      return next
    })
  }, [])

  return { order, moveEarlier, moveLater }
}
