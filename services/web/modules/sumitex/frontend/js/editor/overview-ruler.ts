/**
 * The overview ruler on the editor's right edge (mockup frame 1): a thin
 * strip showing where the whole file's problems, TODO / FIXME notes and the
 * cursor are. Clicking a mark jumps there.
 */
import { forEachDiagnostic } from '@codemirror/lint'
import type { EditorState } from '@codemirror/state'
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

type Mark = { line: number; kind: string; pos: number }

const TODO = /%\s*(TODO|FIXME|XXX)\b/

function collect(state: EditorState): Mark[] {
  const marks: Mark[] = []
  const seen = new Set<string>()
  const add = (pos: number, kind: string) => {
    const line = state.doc.lineAt(pos).number
    const key = `${line}:${kind}`
    if (seen.has(key)) return
    seen.add(key)
    marks.push({ line, kind, pos })
  }

  forEachDiagnostic(state, (diagnostic, from) => {
    if (from <= state.doc.length) {
      add(from, diagnostic.severity === 'error' ? 'error' : 'warning')
    }
  })

  for (let n = 1; n <= state.doc.lines; n++) {
    const line = state.doc.line(n)
    if (line.text.includes('%') && TODO.test(line.text)) add(line.from, 'note')
  }

  add(state.selection.main.head, 'cursor')
  return marks
}

export const overviewRuler = () => [
  ViewPlugin.fromClass(
    class {
      dom: HTMLDivElement
      constructor(readonly view: EditorView) {
        this.dom = document.createElement('div')
        this.dom.className = 'sx-overview-ruler'
        this.dom.setAttribute('aria-hidden', 'true')
        this.dom.addEventListener('mousedown', this.onClick)
        view.dom.appendChild(this.dom)
        this.draw()
      }

      onClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement
        const pos = Number(target.dataset.pos)
        if (!Number.isFinite(pos)) return
        event.preventDefault()
        this.view.dispatch({
          selection: { anchor: pos },
          effects: EditorView.scrollIntoView(pos, { y: 'center' }),
        })
        this.view.focus()
      }

      update(update: ViewUpdate) {
        if (update.transactions.length > 0 || update.geometryChanged) {
          this.draw()
        }
      }

      draw() {
        const { state } = this.view
        const total = Math.max(state.doc.lines, 1)
        this.dom.replaceChildren(
          ...collect(state).map(({ line, kind, pos }) => {
            const mark = document.createElement('div')
            mark.className = `sx-ruler-mark sx-ruler-${kind}`
            mark.style.top = `${((line - 0.5) / total) * 100}%`
            mark.dataset.pos = String(pos)
            return mark
          })
        )
      }

      destroy() {
        this.dom.removeEventListener('mousedown', this.onClick)
        this.dom.remove()
      }
    }
  ),
  EditorView.baseTheme({
    '.sx-overview-ruler': {
      position: 'absolute',
      top: '0',
      bottom: '0',
      right: '12px', // just left of the scrollbar
      width: '6px',
      zIndex: '5',
      pointerEvents: 'none',
    },
    '.sx-ruler-mark': {
      position: 'absolute',
      left: '0',
      right: '0',
      height: '3px',
      marginTop: '-1px',
      borderRadius: '1px',
      cursor: 'pointer',
      pointerEvents: 'auto',
    },
    '.sx-ruler-error': { background: 'var(--content-danger-themed, #ff7a6b)' },
    '.sx-ruler-warning': { background: 'var(--content-warning-themed, #e8b04a)' },
    '.sx-ruler-note': { background: 'var(--sx-accent, #7aa2ff)' },
    '.sx-ruler-cursor': {
      background: 'var(--sx-fg, #e6e4df)',
      height: '2px',
      opacity: '0.7',
      pointerEvents: 'none',
    },
  }),
]
