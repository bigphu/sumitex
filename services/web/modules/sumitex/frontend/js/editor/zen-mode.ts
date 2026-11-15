/**
 * Zen mode for the source editor, built on the stock focus mode.
 *
 * Focus mode already hides the rail and most of the toolbar. Zen adds the
 * editor part: a centred ~72-character column, no line numbers (problem dots
 * in the lint gutter stay), typewriter scrolling, and Esc to leave.
 *
 * The Zen extensions live in a Compartment so they can be switched on and off
 * while the editor runs. SumitexBridge (bridge/sumitex-bridge.tsx) follows
 * the layout context's focusMode and calls setZen.
 */
import { Compartment, EditorState, Extension, Prec } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'

const zenCompartment = new Compartment()

// The current state, so an editor created later (for example when you open
// another file) starts in the right mode.
let zenOn = false

const toggleFocusMode = () => {
  window.dispatchEvent(new CustomEvent('ui.toggle-focus-mode'))
  return true
}

// Keep the cursor line in the middle of the screen while typing or moving
// with the keyboard. Mouse clicks don't recentre, so the text under the
// pointer doesn't jump. A transactionExtender adds the scroll to the same
// transaction; never dispatch from inside an update.
const typewriterScroll = EditorState.transactionExtender.of(tr =>
  tr.selection &&
  (tr.docChanged || tr.isUserEvent('select')) &&
  !tr.isUserEvent('select.pointer')
    ? {
        effects: EditorView.scrollIntoView(tr.selection.main.head, {
          y: 'center',
        }),
      }
    : null
)

const zenTheme = EditorView.theme({
  // .cm-content is a flex child: max-width stops it growing, and the auto
  // margins share out the rest, which centres the column
  '.cm-content': {
    maxWidth: '72ch',
    marginInline: 'auto',
    paddingBottom: '45vh', // room to centre the last lines
  },
  // !important: the stock gutter styles are more specific than this theme
  '.cm-gutters .cm-lineNumbers, .cm-gutters .cm-foldGutter': {
    display: 'none !important',
  },
  '.cm-activeLine': { backgroundColor: 'transparent' },
})

// Lowest precedence: Esc first closes autocomplete, search and other
// panels as usual, and only leaves Zen when nothing else wanted it.
const leaveOnEscape = Prec.lowest(
  keymap.of([{ key: 'Escape', run: toggleFocusMode }])
)

const zenExtensions: Extension = [typewriterScroll, zenTheme, leaveOnEscape]

/** Add once to every editor: the Zen slot plus the Ctrl+K Z chord. */
export const zenMode = (): Extension => [
  zenCompartment.of(zenOn ? zenExtensions : []),
  keymap.of([{ key: 'Mod-k z', run: toggleFocusMode }]),
]

/** Turn Zen on or off in a running editor. */
export const setZen = (view: EditorView, on: boolean) => {
  zenOn = on
  view.dispatch({
    effects: [
      zenCompartment.reconfigure(on ? zenExtensions : []),
      ...(on
        ? [EditorView.scrollIntoView(view.state.selection.main.head, { y: 'center' })]
        : []),
    ],
  })
}
