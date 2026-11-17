/**
 * Adding \usepackage{name} to a preamble, shared by the live linter's fix,
 * Ctrl+. and the "Add package" button on compile errors (guide Phase 3b).
 *
 * Where the line goes:
 * - after the last \usepackage, but before hyperref, which LaTeX wants
 *   near the end; cleveref goes right after hyperref
 * - after \documentclass when nothing is loaded yet
 * - nowhere when the package is already loaded
 *
 * When the package IS loaded, but only after a line that needs it (for
 * example \usetikzlibrary above \usepackage{tikz}), the fix is to load it
 * earlier: the \usepackage line moves up above that line, or, when it
 * loads several packages at once, a \usepackage{name} of its own goes
 * there (LaTeX accepts a package loaded twice the same way).
 *
 * Which file it goes into is the bridge's job (use-project-preamble.ts):
 * the open file when it holds the preamble, otherwise the main file,
 * opened for the edit and closed again.
 */
import type { ChangeSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { parseFile, preambleOf, stripComments } from '../diagnostics/preamble'
import { withLoaded } from '../diagnostics/packages'

type Found = { from: number; to: number; text: string }

const LOAD_COMMAND =
  /\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g

// Each command found in full (options may run over several lines), then
// taken out to the whole lines it covers; commented-out ones are skipped
function findCommands(preamble: string, pattern: RegExp): Found[] {
  return [...preamble.matchAll(pattern)].flatMap(match => {
    const from = preamble.lastIndexOf('\n', match.index!) + 1
    if (/(^|[^\\])%/.test(preamble.slice(from, match.index))) return []
    const end = match.index! + match[0].length
    const lineEnd = preamble.indexOf('\n', end)
    return [
      { from, to: lineEnd === -1 ? preamble.length : lineEnd, text: match[0] },
    ]
  })
}

/** Where and what to insert, or null when there's nothing to do */
export function packageInsertion(
  text: string,
  name: string
): { from: number; insert: string } | null {
  const preamble = preambleOf(text)
  if (!/\\documentclass/.test(stripComments(preamble))) return null
  if (withLoaded(parseFile(preamble).packages).has(name)) return null

  const lines = findCommands(preamble, LOAD_COMMAND)
  const classEnd =
    findCommands(preamble, /\\documentclass\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/g)[0]
      ?.to ?? null

  const usepackage = `\\usepackage{${name}}`
  const hyperref = lines.find(line => /\{[^}]*\bhyperref\b[^}]*\}/.test(line.text))
  const last = lines[lines.length - 1]

  if (name === 'cleveref' && hyperref) {
    return { from: hyperref.to, insert: `\n${usepackage}` }
  }
  if (name !== 'hyperref' && name !== 'cleveref' && hyperref) {
    return { from: hyperref.from, insert: `${usepackage}\n` }
  }
  if (last) return { from: last.to, insert: `\n${usepackage}` }

  if (classEnd !== null) return { from: classEnd, insert: `\n${usepackage}` }
  return null
}

/** The first \usepackage that loads `name` (directly), in the preamble */
export function packageLoadAt(text: string, name: string) {
  const preamble = preambleOf(text)
  for (const found of findCommands(preamble, LOAD_COMMAND)) {
    const names = found.text
      .replace(/^[^{]*\{/, '')
      .replace(/\}$/, '')
      .split(',')
      .map(part => part.trim())
    if (names.includes(name)) return { ...found, alone: names.length === 1 }
  }
  return null
}

/**
 * The edit that loads `name` before position `usedAt`, when it is loaded
 * only after it; null when it is already loaded in time (or not at all).
 */
export function loadEarlierEdit(
  text: string,
  name: string,
  usedAt: number
): ChangeSpec[] | null {
  const load = packageLoadAt(text, name)
  if (!load || load.from <= usedAt) return null
  const lineStart = text.lastIndexOf('\n', usedAt - 1) + 1
  if (load.alone) {
    // Move the whole line(s) up, keeping its options
    const moved = text.slice(load.from, load.to)
    return [
      { from: lineStart, insert: `${moved}\n` },
      { from: load.from, to: Math.min(load.to + 1, text.length) },
    ]
  }
  return [{ from: lineStart, insert: `\\usepackage{${name}}\n` }]
}

export type AddResult = 'added' | 'moved' | 'already' | 'failed'

/**
 * Load `name` in an editor that holds the preamble. With `usedAt`, a
 * package loaded too late is loaded earlier instead.
 */
export function addPackageInView(
  view: EditorView,
  name: string,
  usedAt?: number
): AddResult {
  const text = view.state.doc.toString()
  const insertion = packageInsertion(text, name)
  if (insertion) {
    view.dispatch({
      changes: { from: insertion.from, insert: insertion.insert },
      userEvent: 'input.sumitex-add-package',
    })
    return 'added'
  }
  if (usedAt !== undefined) {
    const changes = loadEarlierEdit(text, name, usedAt)
    if (changes) {
      view.dispatch({ changes, userEvent: 'input.sumitex-add-package' })
      return 'moved'
    }
  }
  return /\\documentclass/.test(stripComments(preambleOf(text)))
    ? 'already'
    : 'failed'
}

export type AddOptions = {
  /** In the file that holds the preamble: where the package is needed */
  usedAt?: number
  /** In the main file: the line (1-based) where the package is needed */
  usedOnLine?: number
}

type Handler = (name: string, options?: AddOptions) => Promise<AddResult>

// The bridge supplies the handler that knows about files
let handler: Handler | null = null

export const setAddPackageHandler = (next: Handler | null) => {
  handler = next
}

/** Load a package in the right file; used by fixes and buttons */
export const requestAddPackage = (name: string, options?: AddOptions) =>
  handler ? handler(name, options) : Promise.resolve<AddResult>('failed')
