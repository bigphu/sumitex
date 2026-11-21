/**
 * Problems in the editor, each shown once:
 * - The gutter marks every line with a problem, with an icon for its kind:
 *   a red circle for an error, an amber triangle for a warning, a blue "i"
 *   for a note (the compile log's layout notes: overfull boxes and the like).
 * - On the cursor line the message is written after the code instead, with
 *   the same icon in front, and that line's gutter icon steps aside.
 *
 * It reads every diagnostic, as the gutter does: the compile log, the syntax
 * check and SumiTeX's own checks. The lint state itself only keeps the ones
 * that get underlined (errors and SumiTeX's checks: markerFilter in
 * source-editor/extensions/annotations.ts), so forEachDiagnostic would miss
 * the stock syntax check's warnings ("unclosed group {") and plain compile
 * warnings. The full list arrives in setDiagnosticsEffect; it is kept here
 * and mapped through edits until the next one.
 */
import { type Diagnostic, setDiagnosticsEffect } from '@codemirror/lint'
import {
  type EditorState,
  RangeSetBuilder,
  StateField,
} from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'

type Problem = { from: number; severity: string; message: string }

// Every diagnostic, by position, as last set
const allProblems = StateField.define<readonly Problem[]>({
  create: () => [],
  update(problems, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setDiagnosticsEffect)) {
        return effect.value.map((d: Diagnostic) => ({
          from: d.from,
          severity: d.severity,
          message: d.message,
        }))
      }
    }
    if (!tr.docChanged || problems.length === 0) return problems
    return problems.map(p => ({ ...p, from: tr.changes.mapPos(p.from, 1) }))
  },
})

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
    span.title = this.message
    // The kind's icon as its own box in front of the text (not ::before, so
    // a wrapped line can't lay it over the words)
    const icon = document.createElement('span')
    icon.className = 'sx-inline-problem-icon'
    icon.setAttribute('aria-hidden', 'true')
    span.append(icon, document.createTextNode(this.message))
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
  const cursorLine = state.doc.lineAt(state.selection.main.head)
  // The cursor line's most severe problem (the one the gutter shows)
  let shown: Problem | null = null
  for (const problem of state.field(allProblems)) {
    if (problem.from < cursorLine.from || problem.from > cursorLine.to) continue
    if (!problem.message.trim()) continue
    if (!shown || (rank[problem.severity] ?? 0) > (rank[shown.severity] ?? 0)) {
      shown = problem
    }
  }

  const builder = new RangeSetBuilder<Decoration>()
  if (shown) {
    builder.add(
      cursorLine.to,
      cursorLine.to,
      Decoration.widget({
        widget: new ProblemText(shorten(shown.message), shown.severity),
        side: 1,
      })
    )
  }
  return builder.finish()
}

// The kinds' icons, for the gutter and in front of the message
const svg = (body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${body}</svg>`
  )}")`

const ICONS = {
  error: svg(
    '<circle cx="8" cy="8" r="6.5" fill="#e5484d"/><path d="M8 4.6v4.2" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/><circle cx="8" cy="11.1" r="1" fill="#fff"/>'
  ),
  warning: svg(
    '<path d="M8 1.8L15 14H1z" fill="#e8a33d" stroke="#e8a33d" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 6v3.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.6" r=".95" fill="#fff"/>'
  ),
  info: svg(
    '<circle cx="8" cy="8" r="6.5" fill="#5b8def"/><circle cx="8" cy="4.9" r="1" fill="#fff"/><path d="M8 7.3v4.2" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>'
  ),
}

export const inlineProblems = () => [
  allProblems,
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
      display: 'inline-block',
      marginLeft: '1.5em',
      fontFamily: 'var(--font-sans, sans-serif)',
      fontSize: '0.85em',
      fontStyle: 'italic',
      opacity: '0.9',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    },
    '.sx-inline-problem-icon': {
      display: 'inline-block',
      width: '1em',
      height: '1em',
      marginRight: '0.4em',
      verticalAlign: '-0.15em',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
    },
    '.sx-inline-problem-error': { color: 'var(--content-danger-themed, #ff7a6b)' },
    '.sx-inline-problem-error .sx-inline-problem-icon': { backgroundImage: ICONS.error },
    '.sx-inline-problem-warning': { color: 'var(--content-warning-themed, #e8b04a)' },
    '.sx-inline-problem-warning .sx-inline-problem-icon': { backgroundImage: ICONS.warning },
    '.sx-inline-problem-info, .sx-inline-problem-hint': { color: 'var(--sx-muted, #a0a7b1)' },
    '.sx-inline-problem-info .sx-inline-problem-icon, .sx-inline-problem-hint .sx-inline-problem-icon':
      { backgroundImage: ICONS.info },
    // The gutter: one icon per kind (upstream drew only errors and warnings)
    '.cm-gutter-lint .cm-lint-marker': {
      width: '1em',
      height: '1em',
      content: 'normal',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
    },
    '.cm-gutter-lint .cm-lint-marker::before': { content: 'none' },
    '.cm-gutter-lint .cm-lint-marker.cm-lint-marker-error': { backgroundImage: ICONS.error },
    '.cm-gutter-lint .cm-lint-marker.cm-lint-marker-warning': { backgroundImage: ICONS.warning },
    '.cm-gutter-lint .cm-lint-marker.cm-lint-marker-info, .cm-gutter-lint .cm-lint-marker.cm-lint-marker-hint':
      { backgroundImage: ICONS.info },
    // The cursor line's message is written out: no icon for it in the gutter
    // too (its gutter cell carries cm-activeLineGutter)
    '.cm-gutter-lint .cm-activeLineGutter .cm-lint-marker': { visibility: 'hidden' },
  }),
]
