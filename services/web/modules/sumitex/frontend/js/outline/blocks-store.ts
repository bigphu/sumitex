/**
 * What the Outline panel reads: the open file's blocks (scanned in the
 * editor by blocks-plugin.ts, read by sumitex-outline.tsx in the left
 * strip), and the panel's two choices, kept per project in this browser:
 * whether block rows show (the Settings default until a project chooses,
 * off unless changed) and the type filter; and whether the one-time tip
 * about the toggle has been seen.
 */
import type { Block } from './scan-blocks'
import type { BlockKind } from './block-types'
import { getOutlineBlocksDefault, subscribePrefs } from '../settings/prefs'

export type BlockFilter = 'all' | 'problems' | BlockKind

let blocks: Block[] = []
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

export const subscribeOutline = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getBlocks = () => blocks

export function setBlocks(next: Block[]) {
  blocks = next
  notify()
}

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked: the choice lasts until the page reloads
  }
}

const memory = new Map<string, string>()
const showKey = (projectId: string) => `sumitex.outline.blocks.${projectId}`
const filterKey = (projectId: string) => `sumitex.outline.filter.${projectId}`

/** The project's own choice; else the default in Settings → Editor */
export function getShowBlocks(projectId: string) {
  const chosen = memory.get(showKey(projectId)) ?? read(showKey(projectId))
  return chosen === null ? getOutlineBlocksDefault() : chosen === 'true'
}

// A new default in Settings shows at once in a project that hasn't chosen
subscribePrefs(notify)

// The one-time tip that points at the Blocks toggle, per browser
const TIP_KEY = 'sumitex.outline.tip-seen'
export const getTipSeen = () => (memory.get(TIP_KEY) ?? read(TIP_KEY)) === 'true'
export function setTipSeen() {
  memory.set(TIP_KEY, 'true')
  write(TIP_KEY, 'true')
  notify()
}

export function setShowBlocks(projectId: string, on: boolean) {
  memory.set(showKey(projectId), String(on))
  write(showKey(projectId), String(on))
  notify()
}

export const getBlockFilter = (projectId: string): BlockFilter =>
  ((memory.get(filterKey(projectId)) ??
    read(filterKey(projectId))) as BlockFilter | null) ?? 'all'

export function setBlockFilter(projectId: string, filter: BlockFilter) {
  memory.set(filterKey(projectId), filter)
  write(filterKey(projectId), filter)
  notify()
}
