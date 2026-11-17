/**
 * Project checks while you type (guide Phase 3; features list, 6, "more
 * checks"), against the whole project rather than the open file alone:
 *
 * - \ref, \cref, \eqref… to a label that no file in the project defines
 * - a \label defined twice (here or in another file)
 * - \cite… to a key that isn't in the project's .bib files (or \bibitem)
 * - \includegraphics, \input and \include of a file that isn't there,
 *   with "Did you mean …?" when only the letter case differs
 * - in a .bib file, two entries with the same key
 *
 * The rest of the project comes from the project snapshot (the index in
 * preamble-store.ts); the open file is read live. Mismatched \begin/\end
 * are left to Overleaf's own linter. Follows the editor's "code check"
 * setting, like the other linters.
 */
import { ViewPlugin, EditorView } from '@codemirror/view'
import { Diagnostic, forceLinting } from '@codemirror/lint'
import { createLinter } from '@/features/source-editor/extensions/linting'
import {
  getProjectPreamble,
  subscribeProjectPreamble,
} from '../diagnostics/preamble-store'
import { bibEntries, findFile, labelsIn } from '../diagnostics/project-index'
import { codeOnly } from '../diagnostics/latex-text'

const MAX_DIAGNOSTICS = 100

const REF =
  /\\(?:ref|eqref|pageref|autoref|nameref|vref|cref|Cref|cpageref|Cpageref|labelcref)\*?\s*\{([^}]*)\}/g
const CITE =
  /\\(?:cite|citep|citet|citealt|citealp|citeauthor|citeyear|parencite|Parencite|textcite|Textcite|autocite|Autocite|footcite|smartcite|nocite)\*?\s*(?:\[[^\]]*\]\s*){0,2}\{([^}]*)\}/g
const LABEL = /\\label\s*\{([^}]+)\}/g
const GRAPHICS = /\\includegraphics\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g
const INPUT = /\\(?:input|include|subfile)\s*\{([^}]+)\}/g

// A key that is a macro argument (#1) or built from commands can't be checked
const checkable = (key: string) => key !== '' && !/[#\\]/.test(key)

/** The keys inside a {a, b} argument, with their positions */
function keysIn(match: RegExpMatchArray) {
  const open = match.index! + match[0].lastIndexOf('{') + 1
  const keys: { key: string; from: number; to: number }[] = []
  let at = open
  for (const part of match[1].split(',')) {
    const lead = part.length - part.trimStart().length
    const key = part.trim()
    if (checkable(key)) {
      keys.push({ key, from: at + lead, to: at + lead + key.length })
    }
    at += part.length + 1
  }
  return keys
}

const warn = (from: number, to: number, message: string): Diagnostic => ({
  from,
  to,
  severity: 'warning',
  source: 'SumiTeX',
  message,
})

function lintBib(text: string): Diagnostic[] {
  const seen = new Map<string, number>()
  const found: Diagnostic[] = []
  const lineOf = (at: number) => text.slice(0, at).split('\n').length
  for (const { key, at } of bibEntries(text)) {
    const first = seen.get(key)
    if (first === undefined) {
      seen.set(key, at)
    } else {
      found.push(
        warn(at, at + key.length, `"${key}" is already an entry on line ${lineOf(first)}. Citations will use only one of them.`)
      )
    }
  }
  return found
}

function lint(view: EditorView): Diagnostic[] {
  const { index, currentPath } = getProjectPreamble()
  if (!index) return []
  const text = view.state.doc.toString()
  if (currentPath?.endsWith('.bib')) return lintBib(text)
  if (currentPath && !currentPath.endsWith('.tex')) return []

  const code = codeOnly(text)
  const found: Diagnostic[] = []
  const full = () => found.length >= MAX_DIAGNOSTICS
  const lineOf = (at: number) => text.slice(0, at).split('\n').length

  // Labels: this file live, the others from the index
  const elsewhere = new Map<string, string>()
  for (const [path, labels] of index.labelsByPath) {
    if (path === currentPath) continue
    for (const label of labels) if (!elsewhere.has(label)) elsewhere.set(label, path)
  }
  const here = new Set(labelsIn(text))
  const firstHere = new Map<string, number>()
  for (const match of code.matchAll(LABEL)) {
    const [first] = keysIn(match)
    if (!first) continue
    const { key, from, to } = first
    const other = elsewhere.get(key)
    const earlier = firstHere.get(key)
    if (other) {
      found.push(warn(from, to, `\\label{${key}} is also defined in ${other}. References will point at only one of them.`))
    } else if (earlier !== undefined) {
      found.push(warn(from, to, `\\label{${key}} is already defined on line ${lineOf(earlier)}.`))
    }
    if (earlier === undefined) firstHere.set(key, from)
    if (full()) return found
  }

  // References to labels that exist nowhere
  for (const match of code.matchAll(REF)) {
    for (const { key, from, to } of keysIn(match)) {
      if (here.has(key) || elsewhere.has(key)) continue
      found.push(warn(from, to, `No \\label{${key}} in the project. It will print as ?? in the PDF.`))
      if (full()) return found
    }
  }

  // Citations, when the project has a bibliography of its own
  const keys = new Set<string>()
  for (const [path, list] of index.citeKeysByPath) {
    if (path !== currentPath) list.forEach(key => keys.add(key))
  }
  for (const match of code.matchAll(/\\bibitem\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g)) {
    keys.add(match[1].trim())
  }
  const bibFiles = [...index.citeKeysByPath.keys()].filter(path => path.endsWith('.bib'))
  if (keys.size > 0) {
    const where = bibFiles.length === 1 ? bibFiles[0] : 'the project’s .bib files'
    for (const match of code.matchAll(CITE)) {
      for (const { key, from, to } of keysIn(match)) {
        if (key === '*' || keys.has(key)) continue
        found.push(warn(from, to, `No entry "${key}" in ${where}. It will print as [?] in the PDF.`))
        if (full()) return found
      }
    }
  }

  // Files
  const missing = (match: RegExpMatchArray, kind: 'image' | 'tex') => {
    const name = match[1].trim()
    if (!checkable(name)) return
    const result = findFile(index, name, kind)
    if (result === 'ok') return
    const from = match.index! + match[0].lastIndexOf('{') + 1
    const to = from + match[1].length
    found.push(
      warn(
        from,
        to,
        result
          ? `No file "${name}". Did you mean ${result.closeMatch}? Paths are case-sensitive.`
          : kind === 'image'
            ? `No image "${name}" in the project. Paths are relative to the main file.`
            : `No file "${name}" in the project. Paths are relative to the main file.`
      )
    )
  }
  for (const match of code.matchAll(GRAPHICS)) {
    missing(match, 'image')
    if (full()) return found
  }
  for (const match of code.matchAll(INPUT)) {
    missing(match, 'tex')
    if (full()) return found
  }
  return found
}

// Check again when the project index changes (after a compile, a file
// switch), not only when this file changes
const relintOnIndexChange = ViewPlugin.define(view => {
  const unsubscribe = subscribeProjectPreamble(() => forceLinting(view))
  return { destroy: unsubscribe }
})

export const projectChecks = () => [
  createLinter(lint, { delay: 800 }),
  relintOnIndexChange,
]
