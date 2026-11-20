/**
 * The command palette, the VS Code way (guide Phase 2b; features list, 4).
 *
 * - Ctrl+P (Cmd+P) opens it files first: file matches come before
 *   commands, and the box hints at the other prefixes.
 * - Ctrl+Shift+P opens it with "> " typed in, so only commands show.
 *   Deleting the ">" shows everything again.
 * - Pressing the other one while the palette is open switches over
 *   instead of closing it.
 * - Ctrl+Shift+O opens it with "@ " typed in: the sections of the open
 *   file (use-sections-source.ts).
 * - "#" lists the open file's labels (use-labels-source.ts).
 * - ":" jumps to a line, as before.
 * - With nothing typed: recent files, then commands (recent-files.ts).
 *
 * The stock palette reads this through a few marked lines in
 * features/command-palette (the trigger, the body and the result order).
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { CommandPaletteSearchResult } from '@/features/command-palette/types'
import { isMac } from '@/shared/utils/os'
import type { PaletteGroup } from './palette-extras'
import { groupOf } from './palette-row'
import { boostRecentCommands, suggestCommands } from './suggestions'

export type PaletteMode = 'files' | 'commands' | 'sections'

const listeners = new Set<() => void>()
let mode: PaletteMode = 'files'
let open = false

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getPaletteMode = () => mode

export function setPaletteMode(next: PaletteMode) {
  if (next === mode) return
  mode = next
  listeners.forEach(listener => listener())
}

export const isPaletteOpen = () => open

const queryFor = (m: PaletteMode) =>
  m === 'commands' ? '> ' : m === 'sections' ? '@ ' : ''

/** The palette's first query: "> " when opened for commands. */
export const initialPaletteQuery = () => queryFor(mode)

/**
 * For the palette body: tracks that it's open, retypes the query when the
 * mode switches while it's open, and gives the placeholder for the box.
 */
export function usePaletteMode(
  setQuery: Dispatch<SetStateAction<string>>,
  fallbackPlaceholder: string
) {
  const current = useSyncExternalStore(subscribe, getPaletteMode)
  const shown = useRef(current)

  useEffect(() => {
    open = true
    return () => {
      open = false
    }
  }, [])

  useEffect(() => {
    if (current === shown.current) return
    shown.current = current
    setQuery(queryFor(current))
  }, [current, setQuery])

  const mod = isMac ? 'Cmd' : 'Ctrl'
  // The chips under the box name the other prefixes
  return current === 'files'
    ? `Search files by name · ${mod}+Shift+P for commands`
    : current === 'sections'
      ? 'Type a section name'
      : fallbackPlaceholder
}

const ALL_GROUPS: PaletteGroup[] = [
  'Recent files',
  'Recently used',
  'Suggested',
  'Files',
  'Commands',
  'Sections in this file',
  'Blocks in this project',
  'Labels in this file',
  'Go to line',
]

// The groups listed first, by the mode the palette was opened in
const GROUP_ORDER: Record<PaletteMode, PaletteGroup[]> = {
  files: ['Recent files', 'Recently used', 'Suggested', 'Files', 'Commands'],
  commands: ['Recently used', 'Suggested', 'Commands', 'Recent files', 'Files'],
  sections: ['Sections in this file'],
}

/**
 * Groups kept together (so each heading shows once), in the mode's order,
 * and by score inside a group.
 *
 * With nothing typed, each mode suggests (suggestions.ts): Ctrl+P shows
 * recent files and a few commands; "> " the commands used last, the
 * suggested ones, then the rest. The sections, labels and line hint wait
 * for their prefix.
 */
export function sortPaletteResults(
  results: CommandPaletteSearchResult[],
  query: string
) {
  const prefix = query.match(/^[>@#:!]/)?.[0] ?? ''
  const typed = query.slice(prefix.length).trim()
  let shown = results

  if (!prefix && !typed) {
    const hasRecent = results.some(r => groupOf(r) === 'Recent files')
    shown = results.filter(result => {
      const group = groupOf(result)
      if (
        group === 'Sections in this file' ||
        group === 'Blocks in this project' ||
        group === 'Labels in this file' ||
        group === 'Go to line'
      )
        return false
      return !(hasRecent && group === 'Files')
    })
  }

  if (!typed && (prefix === '>' || !prefix)) {
    shown = suggestCommands(shown, !prefix && mode !== 'commands')
  } else if (typed) {
    shown = boostRecentCommands(shown)
  }

  const first = GROUP_ORDER[mode]
  const order = [...first, ...ALL_GROUPS.filter(g => !first.includes(g))]
  const rank = (result: CommandPaletteSearchResult) =>
    order.indexOf(groupOf(result))
  return shown.sort((a, b) => rank(a) - rank(b) || b.score - a.score)
}
