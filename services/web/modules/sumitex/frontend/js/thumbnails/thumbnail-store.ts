/**
 * Which projects on the dashboard have a thumbnail, and from when. Each row
 * asks for its project; the asks are gathered into one request
 * (POST /sumitex/thumbnails), so a page of rows costs one call, and rows
 * without a thumbnail never try to load an image.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { postJSON } from '@/infrastructure/fetch-json'

// projectId → the thumbnail's time, or null for none
const known = new Map<string, number | null>()
const pending = new Set<string>()
const listeners = new Set<() => void>()
let flushing: number | undefined

function notify() {
  for (const listener of listeners) listener()
}

async function flush() {
  flushing = undefined
  const ids = [...pending]
  pending.clear()
  if (ids.length === 0) return
  try {
    const { thumbnails } = await postJSON<{
      thumbnails: Record<string, number>
    }>('/sumitex/thumbnails', { body: { ids } })
    for (const id of ids) known.set(id, thumbnails[id] ?? null)
  } catch {
    for (const id of ids) known.set(id, null)
  }
  notify()
}

function request(projectId: string) {
  if (known.has(projectId) || pending.has(projectId)) return
  pending.add(projectId)
  flushing ??= window.setTimeout(flush, 0)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The project's thumbnail URL, or null while unknown or when it has none */
export function useThumbnailUrl(projectId: string) {
  useEffect(() => request(projectId), [projectId])
  const version = useSyncExternalStore(subscribe, () => known.get(projectId))
  return version
    ? `/sumitex/project/${projectId}/thumbnail?v=${version}`
    : null
}
