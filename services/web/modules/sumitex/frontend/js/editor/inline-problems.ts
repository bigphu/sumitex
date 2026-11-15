/**
 * Problem text at the end of the line (mockup frames 1 and 4): quiet by
 * default. Errors always show their message after the line; warnings and
 * notes show theirs only on the cursor line. Elsewhere the gutter dot is
 * enough. Reads the same diagnostics as the lint gutter (compile log
 * annotations and the syntax check).
 */
import { forEachDiagnostic } from '@codemirror/lint'
import { RangeSetBuilder, type EditorState } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'

class ProblemText extends WidgetType {
  constructor(
    readonly message: string,
    readonly severity: string
  ) {
    super()
  }

  eq(other: ProblemText) {
    return other.message === this.message && other.severity === this.severity
  }

  toDOM() {
    const span = document.createElement('span')
    span.className = `sx-inline-problem sx-inline-problem-${this.severity}`
    span.textContent = this.message
    span.title = this.message
    return span
  }

  ignoreEvent() {
    return false
  }
}

// The first line of a message, short enough to sit after the code
const shorten = (message: string) => {
  const firstLine = message.split('\n')[0].trim()
  return firstLine.length > 90 ? firstLine.slice(0, 87) + '…' : firstLine
}

const rank: Record<string, number> = { error: 3, warning: 2, info: 1, hint: 0 }

function build(state: EditorState): DecorationSet {
  const cursorLine = state.doc.lineAt(state.selection.main.head).number
  // One message per line: the most severe one
  const perLine = new Map<number, { message: string; severity: string }>()

  forEachDiagnostic(state, (diagnostic, from) => {
    if (from > state.doc.length) return
    const line = state.doc.lineAt(from).number
    const severity = diagnostic.severity
    if (severity !== 'error' && line !== cursorLine) return
    const current = perLine.get(line)
    if (!current || (rank[severity] ?? 0) > (rank[current.severity] ?? 0)) {
      perLine.set(line, { message: shorten(diagnostic.message), severity })
    }
  })

  const builder = new RangeSetBuilder<Decoration>()
  for (const line of [...perLine.keys()].sort((a, b) => a - b)) {
    const { message, severity } = perLine.get(line)!
    builder.add(
      state.doc.line(line).to,
      state.doc.line(line).to,
      Decoration.widget({ widget: new ProblemText(message, severity), side: 1 })
    )
  }
  return builder.finish()
}

export const inlineProblems = () => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = build(view.state)
      }

      update(update: ViewUpdate) {
        // Diagnostics arrive as state effects, so rebuild on any transaction;
        // the work is one pass over a handful of diagnostics
        if (update.transactions.length > 0) {
          this.decorations = build(update.state)
        }
      }
    },
    { decorations: plugin => plugin.decorations }
  ),
  EditorView.baseTheme({
    '.sx-inline-problem': {
      marginLeft: '1.5em',
      fontFamily: 'var(--font-sans, sans-serif)',
      fontSize: '0.85em',
      fontStyle: 'italic',
      opacity: '0.9',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    },
    '.sx-inline-problem-error': { color: 'var(--content-danger-themed, #ff7a6b)' },
    '.sx-inline-problem-warning': { color: 'var(--content-warning-themed, #e8b04a)' },
    '.sx-inline-problem-info, .sx-inline-problem-hint': { color: 'var(--sx-muted, #a0a7b1)' },
  }),
]
