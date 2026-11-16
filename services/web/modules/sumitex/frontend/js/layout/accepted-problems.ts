/**
 * Warnings you've accepted (mockup frame 4: "accepted" on a problem, "Hide
 * accepted" in the log panel's header). Saved per project in this browser.
 *
 * A problem is known by its level, file, line and message, so an accepted
 * warning comes back if the text around it moves to another line or the
 * warning itself changes (an overfull box getting wider, say). Errors can't
 * be accepted.
 */
import type { LogEntry } from '@/features/pdf-preview/util/types'

const HIDE_KEY = 'sumitex.problems.hide-accepted'
const acceptedKey = (projectId: string) => `sumitex.problems.accepted.${projectId}`

const listeners = new Set<() => void>()
let projectId: string | null = null
let accepted: ReadonlySet<string> = new Set()
let hideAccepted = readHide()

function readHide() {
  try {
    return localStorage.getItem(HIDE_KEY) === 'true'
  } catch {
    return false
  }
}

const notify = () => listeners.forEach(listener => listener())

export const subscribeAccepted = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getAccepted = () => accepted
export const getHideAccepted = () => hideAccepted

export const canAccept = (entry: Pick<LogEntry, 'level'>) =>
  entry.level !== 'error'

export const problemKey = (
  entry: Pick<LogEntry, 'level' | 'file' | 'line' | 'message'>
) => [entry.level, entry.file ?? '', entry.line ?? '', entry.message].join('|')

export function loadAccepted(id: string) {
  if (id === projectId) return
  projectId = id
  try {
    const saved = JSON.parse(localStorage.getItem(acceptedKey(id)) || '[]')
    accepted = new Set(Array.isArray(saved) ? saved : [])
  } catch {
    accepted = new Set()
  }
  notify()
}

export function toggleAccepted(key: string) {
  if (!projectId) return
  const next = new Set(accepted)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  accepted = next
  try {
    localStorage.setItem(acceptedKey(projectId), JSON.stringify([...next]))
  } catch {
    // storage blocked: the choice lasts until reload
  }
  notify()
}

export function setHideAccepted(value: boolean) {
  hideAccepted = value
  try {
    localStorage.setItem(HIDE_KEY, String(value))
  } catch {
    // storage blocked: the choice lasts until reload
  }
  notify()
}
