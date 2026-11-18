/**
 * Problems in a snippet file (.sxs, and the personal snippets editor),
 * shown as you type: a header SumiTeX can't read, a snippet with no
 * \endsnippet, a bad option or capture, a trigger used twice, and a note
 * where a snippet replaces a built-in one.
 */
import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { Diagnostic, linter } from '@codemirror/lint'
import { parseSnippets } from '../snippets/format'
import { builtinDefs } from '../snippets/registry'
import { isSnippetText } from './snippet-file'

function lintSnippetFile(view: EditorView): Diagnostic[] {
  const text = view.state.doc.toString()
  if (!isSnippetText(text)) return []
  const { doc } = view.state
  const lineRange = (number: number) => {
    const line = doc.line(Math.min(Math.max(number, 1), doc.lines))
    return { from: line.from, to: line.to }
  }

  const { defs, problems } = parseSnippets(text, 'project')
  const found: Diagnostic[] = problems.map(problem => ({
    ...lineRange(problem.line),
    severity: problem.severity,
    message: problem.message,
    source: 'SumiTeX snippets',
  }))

  const builtIn = new Set(builtinDefs().map(def => def.trigger))
  const seen = new Map<string, number>()
  for (const def of defs) {
    const first = seen.get(def.trigger)
    if (first !== undefined) {
      found.push({
        ...lineRange(def.line),
        severity: 'warning',
        message: `${def.trigger} is already defined on line ${first}; this one is ignored`,
        source: 'SumiTeX snippets',
      })
      continue
    }
    seen.set(def.trigger, def.line)
    if (builtIn.has(def.trigger)) {
      found.push({
        ...lineRange(def.line),
        severity: 'info',
        message: `Replaces SumiTeX's built-in ${def.trigger}`,
        source: 'SumiTeX snippets',
      })
    }
  }
  return found
}

export const snippetFileLint = (): Extension =>
  linter(lintSnippetFile, { delay: 400 })
