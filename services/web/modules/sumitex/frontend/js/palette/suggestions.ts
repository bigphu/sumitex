/**
 * What the palette suggests before anything is typed, per mode, and how
 * commands rank once something is:
 *
 * - Ctrl+P (files):     recent files, then the commands you used last and
 *                       a few suggested ones
 * - Ctrl+Shift+P (> ):  the commands you used last, the suggested ones
 *                       (the mockup's list, frame 2), then every other one
 * - @ and #:            every section or label of the open file, in order
 * - :                   a hint with the file's line count
 *
 * Commands you run from the palette are remembered (last 5, in this
 * browser) and rank a little higher in later searches too.
 */
import type { CommandPaletteSearchResult } from '@/features/command-palette/types'

/** Suggested commands, in the order shown (mockup frame 2) */
export const SUGGESTED_COMMANDS = [
  'compile',
  'sumitex-toggle-zen-mode',
  'change-layout-side-by-side',
  'change-layout-editor-only',
  'change-layout-pdf-only',
  'sumitex-go-to-line',
  'insert-display-math',
  'insert-figure-from-project-files',
  'insert-table',
  'insert-citation',
  'sumitex-toggle-problems',
  'show_version_history',
  'sumitex-keyboard-shortcuts',
]

// How many suggestions the files mode shows under the recent files
const FILES_MODE_SUGGESTIONS = 4

const RECENT_KEY = 'sumitex.palette.recent-commands'
const MAX_RECENT = 5

function readRecent(): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

/** Called by the palette when a result is run: remember commands */
export function recordPaletteUse(result: CommandPaletteSearchResult) {
  const segment = result.eventSegmentation
  if (segment.source !== 'command-registry') return
  const ids = readRecent().filter(id => id !== segment.item)
  try {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([segment.item, ...ids].slice(0, MAX_RECENT))
    )
  } catch {
    // storage blocked: no "Recently used" group
  }
}

const commandId = (result: CommandPaletteSearchResult) =>
  result.eventSegmentation.source === 'command-registry'
    ? result.eventSegmentation.item
    : null

/**
 * With nothing typed after the prefix: sort the commands into Recently
 * used, Suggested and the rest, in that order. In files mode only the
 * first two groups show, and only a few suggestions.
 */
export function suggestCommands(
  results: CommandPaletteSearchResult[],
  filesMode: boolean
) {
  const recent = readRecent()
  const available = new Set(results.map(commandId))
  // The suggestions to show, in their own order, without the recent ones
  const suggested = SUGGESTED_COMMANDS.filter(
    id => available.has(id) && !recent.includes(id)
  ).slice(0, filesMode ? FILES_MODE_SUGGESTIONS : undefined)

  const out: CommandPaletteSearchResult[] = []
  for (const result of results) {
    const id = commandId(result)
    if (id === null) {
      out.push(result)
      continue
    }
    if (recent.includes(id)) {
      result.sumitex = { ...result.sumitex, group: 'Recently used' }
      result.score = 1000 - recent.indexOf(id)
    } else if (suggested.includes(id)) {
      result.sumitex = { ...result.sumitex, group: 'Suggested' }
      result.score = 1000 - suggested.indexOf(id)
    } else if (filesMode) {
      continue
    }
    out.push(result)
  }
  return out
}

/** Once something is typed: the commands used last rank a little higher */
export function boostRecentCommands(results: CommandPaletteSearchResult[]) {
  const recent = readRecent()
  for (const result of results) {
    const id = commandId(result)
    const at = id === null ? -1 : recent.indexOf(id)
    if (at !== -1) result.score *= 1.5 - at * 0.08
  }
  return results
}
