/**
 * Problems in a project snippet file (.sxs), shown as you type: a header
 * SumiTeX can't read, a snippet with no \endsnippet, a trigger used twice,
 * and a note where a snippet replaces a built-in one.
 */
import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { Diagnostic, linter } from '@codemirror/lint'
import { parseSnippetFile } from './project-snippets'
import { isSnippetText } from './snippet-file'
import { PRESETS } from './presets'

function lintSnippetFile(view: EditorView): Diagnostic[] {
  const text = view.state.doc.toString()
  if (!isSnippetText(text)) return []
  const { doc } = view.state
  const lineRange = (number: number) => {
    const line = doc.line(Math.min(Math.max(number, 1), doc.lines))
    return { from: line.from, to: line.to }
  }

  const { presets, lines, problems } = parseSnippetFile(text)
  const found: Diagnostic[] = problems.map(problem => ({
    ...lineRange(problem.line),
    severity: 'error',
    message: problem.message,
    source: 'SumiTeX snippets',
  }))

  const builtIn = new Set(PRESETS.map(preset => preset.trigger))
  const seen = new Map<string, number>()
  presets.forEach((preset, i) => {
    const line = lines[i]
    const first = seen.get(preset.trigger)
    if (first !== undefined) {
      found.push({
        ...lineRange(line),
        severity: 'warning',
        message: `${preset.trigger} is already defined on line ${first}; the menu will show both`,
        source: 'SumiTeX snippets',
      })
    } else {
      seen.set(preset.trigger, line)
      if (builtIn.has(preset.trigger)) {
        found.push({
          ...lineRange(line),
          severity: 'info',
          message: `Replaces SumiTeX's built-in ${preset.trigger} in this project`,
          source: 'SumiTeX snippets',
        })
      }
    }
  })
  return found
}

export const snippetFileLint = (): Extension =>
  linter(lintSnippetFile, { delay: 400 })
