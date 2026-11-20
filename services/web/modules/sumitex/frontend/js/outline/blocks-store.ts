/**
 * What the Outline panel reads: the open file's blocks (scanned in the
 * editor by blocks-plugin.ts, read by sumitex-outline.tsx in the left
 * strip), and the panel's two choices, kept per project in this browser:
 * whether block rows show (off by default) and the type filter.
 */
import type { Block } from './scan-blocks'
import type { BlockKind } from './block-types'

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

export const getShowBlocks = (projectId: string) =>
  (memory.get(showKey(projectId)) ?? read(showKey(projectId))) === 'true'

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
