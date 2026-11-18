// SumiTeX: the equation preview, reworked (upstream floated it above the
// start of the equation, hid it on any parse error and when there was no
// room above, and rebuilt it on every keystroke):
// - It's a block under the math (under the line, for $…$ in a paragraph),
//   taking its own space instead of covering text.
// - One preview element per editor, updated in place about 150 ms after
//   you pause. While the math is incomplete or MathJax can't render it, the
//   last good render stays, dimmed and marked "incomplete", where it was.
// - Long equations scroll sideways.
// - Esc hides it for this equation; Alt+P shows or hides it again.
import {
  Decoration,
  DecorationSet,
  EditorView,
  keymap,
  Tooltip,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import {
  Compartment,
  EditorState,
  Extension,
  Prec,
  StateEffect,
  StateField,
  TransactionSpec,
} from '@codemirror/state'
import { loadMathJax } from '../../mathjax/load-mathjax'
import { descendantsOfNodeWithType } from '../utils/tree-query'
import {
  MathContainer,
  mathAncestorNode,
  parseMathContainer,
} from '../utils/tree-operations/math'
import { documentCommands } from '../languages/latex/document-commands'
import { debugConsole } from '@/utils/debugging'
import { nodeHasError } from '../utils/tree-operations/common'
import { documentEnvironments } from '../languages/latex/document-environments'
import { closeAllContextMenusEffect } from '../utils/close-all-context-menus-effect'

const HIDE_TOOLTIP_EVENT = 'editor:hideMathTooltip'

// How long typing has to pause before the preview is drawn again
const RENDER_DELAY_MS = 150

export const mathPreview = (enabled: boolean): Extension => {
  return mathPreviewConf.of(
    enabled ? [mathPreviewTheme, mathPreviewExtension] : [mathPreviewTheme]
  )
}

export const hideTooltipEffect = StateEffect.define<null>()
const toggleEffect = StateEffect.define<null>()

const mathPreviewConf = new Compartment()

export const setMathPreview = (enabled: boolean): TransactionSpec => ({
  effects: mathPreviewConf.reconfigure(enabled ? mathPreviewExtension : []),
})

type Container = MathContainer & {
  /** The whole math, delimiters or environment included */
  from: number
  to: number
  /** Parses without errors, so worth drawing */
  valid: boolean
}

type PreviewState = {
  /** Always null: kept for upstream's menu (math-preview-tooltip.tsx),
   * which only shows on a floating preview */
  tooltip: Tooltip | null
  decorations: DecorationSet
  container: Container | null
  /** Where the preview hangs: the equation's end, or while the math is
   * broken (and its end unknown), where it was last known */
  anchor: number | null
  hide: boolean
}

function getContainer(state: EditorState): Container | null {
  const range = state.selection.main
  if (!range.empty) return null
  // if anywhere inside Math, find the whole Math node
  const ancestorNode = mathAncestorNode(state, range.from)
  if (!ancestorNode) return null
  const [node] = descendantsOfNodeWithType(ancestorNode, 'Math', 'Math')
  if (!node) return null
  const parsed = parseMathContainer(state, node, ancestorNode)
  if (!parsed) return null
  return {
    ...parsed,
    from: ancestorNode.from,
    to: ancestorNode.to,
    valid: !nodeHasError(ancestorNode),
  }
}

// One preview element per editor, kept between renders and moved into the
// block wherever it's drawn
const hosts = new WeakMap<EditorView, HTMLDivElement>()

function hostFor(view: EditorView) {
  let host = hosts.get(view)
  if (!host) {
    host = document.createElement('div')
    host.className = 'sx-math-preview sx-empty'
    hosts.set(view, host)
  }
  return host
}

class InlinePreview extends WidgetType {
  constructor(readonly from: number) {
    super()
  }

  eq(other: InlinePreview) {
    return other.from === this.from
  }

  toDOM(view: EditorView) {
    const dom = document.createElement('div')
    dom.className = 'sx-math-inline-preview'
    dom.appendChild(hostFor(view))
    return dom
  }

  ignoreEvent() {
    return true
  }
}

function computeState(
  state: EditorState,
  hide: boolean,
  previous: PreviewState | null,
  mapPos: (pos: number) => number = pos => pos
): PreviewState {
  const container = getContainer(state)
  let anchor: number | null = null
  if (container) {
    const head = state.selection.main.head
    const sameEquation =
      previous?.container && mapPos(previous.container.from) === container.from
    const last =
      sameEquation && previous.anchor !== null ? mapPos(previous.anchor) : null
    anchor = container.valid
      ? container.to
      : last !== null && last >= head
        ? last
        : state.doc.lineAt(head).to
  }
  if (!container || anchor === null || hide || !container.content.trim()) {
    return {
      tooltip: null,
      decorations: Decoration.none,
      container,
      anchor,
      hide: container ? hide : false,
    }
  }
  const line = state.doc.lineAt(anchor)
  return {
    tooltip: null,
    decorations: Decoration.set([
      Decoration.widget({
        widget: new InlinePreview(container.from),
        block: true,
        side: 1,
      }).range(line.to),
    ]),
    container,
    anchor,
    hide,
  }
}

export const mathPreviewStateField = StateField.define<PreviewState>({
  create: state => computeState(state, false, null),

  update(value, tr) {
    let hide = value.hide
    let changed = tr.docChanged || !!tr.selection
    for (const effect of tr.effects) {
      if (effect.is(hideTooltipEffect)) {
        hide = true
        changed = true
      } else if (effect.is(toggleEffect)) {
        hide = value.decorations.size > 0
        changed = true
      } else if (effect.is(closeAllContextMenusEffect)) {
        return { ...value, decorations: Decoration.none }
      }
    }
    if (!changed) return value
    // Esc hides one equation: moving straight into another shows it again
    if (hide && value.container) {
      const next = getContainer(tr.state)
      if (next && next.from !== tr.changes.mapPos(value.container.from)) {
        hide = tr.effects.some(effect => effect.is(hideTooltipEffect))
      }
    }
    return computeState(tr.state, hide, value, pos => tr.changes.mapPos(pos))
  },

  provide: field => [
    EditorView.decorations.from(field, value => value.decorations),
  ],
})

/** The TeX definitions in the document, so the preview knows them */
function definitionsIn(state: EditorState) {
  let definitions = ''
  const environmentState = state.field(documentEnvironments, false)
  for (const environment of environmentState?.items ?? []) {
    if (environment.type === 'definition') {
      definitions += `${environment.raw}\n`
    }
  }
  const commandState = state.field(documentCommands, false)
  for (const command of commandState?.items ?? []) {
    if (command.type === 'definition' && command.raw) {
      definitions += `${command.raw}\n`
    }
  }
  return definitions
}

async function renderMath(
  content: string,
  displayMode: boolean,
  element: HTMLElement,
  definitions: string
) {
  const MathJax = await loadMathJax()
  MathJax.texReset([0]) // equation numbering is disabled, but this is still needed
  try {
    await MathJax.tex2svgPromise(definitions)
  } catch {
    // ignore errors thrown during parsing command definitions
  }
  const math = await MathJax.tex2svgPromise(content, {
    ...MathJax.getMetricsFor(element, displayMode),
    display: displayMode,
  })
  // MathJax reports TeX errors inside the output instead of throwing
  if (math.querySelector?.('[data-mjx-error], merror')) {
    throw new Error('TeX error in the equation')
  }
  return math
}

/** Draws the preview: in place, after a pause, keeping the last good one */
const renderer = ViewPlugin.fromClass(
  class {
    from: number | null = null
    drawn: string | null = null
    wanted: string | null = null
    timer: number | null = null

    constructor(readonly view: EditorView) {
      this.sync()
    }

    update(update: ViewUpdate) {
      if (this.from !== null && update.docChanged) {
        this.from = update.changes.mapPos(this.from)
      }
      this.sync()
    }

    sync() {
      const { container } = this.view.state.field(mathPreviewStateField)
      const host = hostFor(this.view)
      if (!container) return

      if (container.from !== this.from) {
        // Another equation: start afresh
        this.from = container.from
        this.drawn = null
        this.wanted = null
        host.replaceChildren()
        host.classList.add('sx-empty')
        host.classList.remove('sx-stale')
      }

      const content = container.content.trim()
      if (!container.valid || !content) {
        host.classList.toggle('sx-stale', this.drawn !== null)
        return
      }
      if (content === this.wanted) return
      this.wanted = content
      host.classList.toggle('sx-stale', this.drawn !== null)
      if (this.timer !== null) window.clearTimeout(this.timer)
      const draw = () => {
        this.timer = null
        void this.draw(container, content)
      }
      if (this.drawn === null) draw()
      else this.timer = window.setTimeout(draw, RENDER_DELAY_MS)
    }

    async draw(container: Container, content: string) {
      const host = hostFor(this.view)
      try {
        const math = await renderMath(
          container.content,
          container.displayMode,
          host,
          definitionsIn(this.view.state)
        )
        // A newer request, or another equation, won while this one drew
        if (this.wanted !== content || this.from !== container.from) return
        host.replaceChildren(math)
        host.classList.remove('sx-empty', 'sx-stale')
        this.drawn = content
        this.reveal()
      } catch (error) {
        if (this.wanted === content) host.classList.add('sx-stale')
        debugConsole.debug('SumiTeX: equation preview', error)
      }
    }

    /** Scroll a preview hanging under the bottom edge into view, as long as
     * the line being typed is on screen */
    reveal() {
      const view = this.view
      view.requestMeasure({
        read: () => {
          const host = hostFor(view)
          if (!host.isConnected) return 0
          const edge = view.scrollDOM.getBoundingClientRect().bottom
          const cursor = view.coordsAtPos(view.state.selection.main.head)
          if (!cursor || cursor.bottom > edge) return 0
          return Math.max(0, host.getBoundingClientRect().bottom + 12 - edge)
        },
        write: by => {
          if (by > 0) view.scrollDOM.scrollTop += by
        },
      })
    }

    destroy() {
      if (this.timer !== null) window.clearTimeout(this.timer)
    }
  }
)

const hideOnEvent = ViewPlugin.define(view => {
  const hideTooltip = () => {
    view.dispatch({ effects: hideTooltipEffect.of(null) })
  }
  window.addEventListener(HIDE_TOOLTIP_EVENT, hideTooltip)
  return {
    destroy() {
      window.removeEventListener(HIDE_TOOLTIP_EVENT, hideTooltip)
    },
  }
})

// Esc hides the preview for this equation; Alt+P shows or hides it
const previewKeys = Prec.high(
  keymap.of([
    {
      key: 'Escape',
      run: view => {
        const value = view.state.field(mathPreviewStateField, false)
        if (value?.decorations.size) {
          view.dispatch({ effects: hideTooltipEffect.of(null) })
        }
        return false
      },
    },
    {
      key: 'Alt-p',
      run: view => {
        const value = view.state.field(mathPreviewStateField, false)
        if (!value?.container) return false
        view.dispatch({ effects: toggleEffect.of(null) })
        return true
      },
    },
  ])
)

const mathPreviewExtension: Extension = [
  mathPreviewStateField,
  renderer,
  hideOnEvent,
  previewKeys,
]

/**
 * Styles for the preview
 */
const mathPreviewTheme = EditorView.baseTheme({
  '.sx-math-preview': {
    transition: 'opacity 0.15s',
  },
  // The last good render, while the math is mid-edit
  '.sx-math-preview.sx-stale': {
    opacity: '0.5',
  },
  '.sx-math-preview.sx-stale::after': {
    content: '"incomplete"',
    display: 'block',
    textAlign: 'right',
    marginTop: '2px',
    fontSize: '10px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    opacity: '0.8',
  },
  '.sx-math-inline-preview': {
    padding: '6px 12px',
    margin: '2px 0 6px',
    borderLeft: '2px solid var(--sx-accent, #7aa2ff)',
    overflowX: 'auto',
  },
  // Nothing drawn yet: no empty block
  '.sx-math-inline-preview:has(.sx-math-preview.sx-empty)': {
    display: 'none',
  },
})
