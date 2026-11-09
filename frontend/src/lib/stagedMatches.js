// Staged loading of one league's matches: today first, then the next two
// days, then everything else (rest of the future + the past, in parallel).
// Each stage is handed to `onStage` as soon as it lands so the UI can paint
// today's games without waiting on the full window — see backend/scopes.py
// for what each `range` slice covers.

export const FULL_STAGES = [['today'], ['soon'], ['later', 'past']]
// Cheap refresh for polling: the only games that can change state are
// today's and the next couple of days'.
export const POLL_STAGES = [['today', 'soon']]

// Resolves true if every request succeeded. Rejects only if the very first
// stage fails entirely (nothing to show); a failure in a later stage just
// leaves that slice missing and resolves false so the caller can retry the
// full load on its next poll.
export async function loadMatchesStaged(fetchJSON, league, onStage, stages = FULL_STAGES) {
  let complete = true
  for (let i = 0; i < stages.length; i++) {
    const results = await Promise.allSettled(
      stages[i].map(scope => fetchJSON(`/api/${league}/matches?range=${scope}`))
    )
    const fulfilled = results.filter(r => r.status === 'fulfilled')
    if (fulfilled.length === 0 && i === 0) throw results[0].reason
    if (fulfilled.length < results.length) {
      complete = false
      results.filter(r => r.status === 'rejected').forEach(r =>
        console.warn(`${league} matches stage ${i + 1} partially failed`, r.reason)
      )
    }
    fulfilled.forEach(r => onStage(r.value))
  }
  return complete
}

// Folds one stage's response into what's already shown. Matches are keyed by
// id (a newer copy replaces an older one) and kept in date order, the order
// the unscoped endpoint always returned them in.
export function upsertMatches(prev, incoming) {
  if (!prev?.matches) return incoming
  const byId = new Map(prev.matches.map(m => [m.id, m]))
  incoming.matches.forEach(m => byId.set(m.id, m))
  const matches = [...byId.values()].sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''))
  return { ...incoming, matches }
}
