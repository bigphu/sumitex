/**
 * The SumiTeX guide on the page (the server side is app/src/GuideManager):
 * which project is the handbook, which is this user's playground, and
 * whether newer exercises exist. Asked once per page, and again after the
 * playground changes.
 */
import { useEffect, useSyncExternalStore } from 'react'
import getMeta from '@/utils/meta'

export type GuideInfo = {
  enabled: boolean
  guideProjectId?: string | null
  hasPlayground?: boolean
  playgroundProjectId?: string | null
  outdated?: boolean
}

let info: GuideInfo = { enabled: false }
let asked = false
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

async function load() {
  try {
    const response = await fetch('/sumitex/guide', { headers: { Accept: 'application/json' } })
    if (!response.ok) return
    info = (await response.json()) as GuideInfo
    listeners.forEach(listener => listener())
  } catch {
    // offline or not signed in: no guide
  }
}

/** The guide's state; asks the server the first time */
export function useGuideInfo() {
  useEffect(() => {
    if (!asked) {
      asked = true
      void load()
    }
  }, [])
  return useSyncExternalStore(subscribe, () => info)
}

export const openGuide = () => window.location.assign('/sumitex/guide/open')

/**
 * Open the user's playground: theirs if it exists, else a new copy. With
 * `fresh`, the old one is kept as "(cũ)" and a new copy is made.
 */
export async function openPlayground(fresh = false) {
  const response = await fetch('/sumitex/playground', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-CSRF-Token': getMeta('ol-csrfToken'),
    },
    body: JSON.stringify({ fresh }),
  })
  const body = (await response.json().catch(() => null)) as { projectId?: string; error?: string } | null
  if (!response.ok || !body?.projectId) {
    throw new Error(body?.error ?? 'The playground could not be opened.')
  }
  window.location.assign(`/project/${body.projectId}`)
}
