/**
 * VS Code keys (guide Phase 2a; features list, 3). Most of VS Code's line
 * keys already work, because the editor includes CodeMirror's default
 * keymap: Alt+↑/↓ move a line, Shift+Alt+↑/↓ copy it, Ctrl+Shift+K deletes
 * it, Ctrl+/ toggles a comment and Ctrl+Shift+\ jumps to the matching
 * bracket. This adds the ones that were missing or did something else:
 *
 * - Ctrl+L          select the line (again: the next one too)
 * - Ctrl+Shift+L    select every match of the selection
 *                   (in stock Overleaf this was Go to line…)
 * - Ctrl+G          …so Go to line moves here, as in VS Code. Find next
 *                   stays on F3 and Enter in the search box (and Cmd+G on
 *                   a Mac, where Go to line is Ctrl+G, as in VS Code).
 * - Ctrl+K Ctrl+S   the keyboard shortcuts sheet
 * - Ctrl+K Ctrl+0   fold all; Ctrl+K Ctrl+J unfold all
 * - Shift+Alt+→/←   grow the selection to the enclosing group or
 *                   environment, and shrink it back
 * - Shift+F8        previous problem (F8, the next one, was already there)
 *
 * Where VS Code and Overleaf disagree (decided 16 Nov 2026):
 * - Ctrl+D          VS Code: add the next match to the selection (Overleaf
 *                   deleted the line; Ctrl+Shift+K does that).
 *                   Ctrl+K Ctrl+D skips the current match.
 * - Ctrl+J          stays Overleaf's Review; Problems and the log are
 *                   Ctrl+Shift+M, as in VS Code (layout/use-global-shortcuts).
 * - Alt+click       VS Code: add a cursor; Shift+Alt+drag selects a column
 *                   (Overleaf: Ctrl+click adds a cursor, which still works,
 *                   and Alt+drag selected a column).
 * - Kept as in Overleaf: Ctrl+B bold, Ctrl+U uppercase, and Ctrl+S /
 *   Ctrl+Enter compile. Focus mode (Zen) moves to Ctrl+K Z.
 *
 * Everything here steps aside while Vim or Emacs keys are on (the bridge
 * keeps setVscodeKeys in step with the setting).
 */
import { EditorSelection, Prec } from '@codemirror/state'
import {
  Command,
  EditorView,
  keymap,
  rectangularSelection,
} from '@codemirror/view'
import {
  gotoLine,
  selectNextOccurrence,
  selectSelectionMatches,
} from '@codemirror/search'
import { selectParentSyntax } from '@codemirror/commands'
import { foldAll, unfoldAll } from '@codemirror/language'
import { previousDiagnostic } from '@codemirror/lint'

let enabled = true

/** On for the default keybindings, off for Vim and Emacs. */
export const setVscodeKeys = (on: boolean) => {
  enabled = on
}

export const vscodeKeysOn = () => enabled

/** Asks the bridge to open the keyboard shortcuts sheet. */
export const SHOW_SHORTCUTS_EVENT = 'sumitex:show-shortcuts'

// Ctrl+L as in VS Code: select the line, and each press after that adds
// the next line (CodeMirror's selectLine stops at the first)
const expandLineSelection: Command = view => {
  const { state } = view
  const ranges = state.selection.ranges.map(range => {
    const first = state.doc.lineAt(range.from)
    const last = state.doc.lineAt(range.to)
    return EditorSelection.range(
      first.from,
      Math.min(last.to + 1, state.doc.length)
    )
  })
  view.dispatch({
    selection: EditorSelection.create(ranges, state.selection.mainIndex),
    scrollIntoView: true,
    userEvent: 'select',
  })
  return true
}

// Ctrl+D adds the next match. CodeMirror keeps the first selection as the
// main one, so remember which range was added last, for Ctrl+K Ctrl+D.
let lastAdded: { from: number; to: number } | null = null

const sameRange = (
  a: { from: number; to: number },
  b: { from: number; to: number }
) => a.from === b.from && a.to === b.to

const addNextOccurrence: Command = view => {
  const before = view.state.selection
  if (!selectNextOccurrence(view)) return false
  const added = view.state.selection.ranges.find(
    range => !before.ranges.some(old => sameRange(old, range))
  )
  lastAdded = added ? { from: added.from, to: added.to } : null
  return true
}

// Ctrl+K Ctrl+D: move the newest selection on to the next match
const skipOccurrence: Command = view => {
  const before = view.state.selection
  const skipped =
    (lastAdded && before.ranges.find(range => sameRange(range, lastAdded!))) ||
    before.main
  if (!addNextOccurrence(view)) return false
  // A bare cursor: the first press only selects the word under it
  if (before.main.empty) return true
  const ranges = view.state.selection.ranges.filter(
    range => !sameRange(range, skipped)
  )
  const newest = ranges.findIndex(
    range => lastAdded !== null && sameRange(range, lastAdded)
  )
  view.dispatch({
    selection: EditorSelection.create(ranges, Math.max(newest, 0)),
    scrollIntoView: true,
    userEvent: 'select',
  })
  return true
}

// Shift+Alt+→ grows the selection to the enclosing syntax node (word,
// group, environment…); Shift+Alt+← walks back through what it grew from
type GrowStep = { from: EditorSelection; to: EditorSelection }
const growHistory = new WeakMap<EditorView, GrowStep[]>()

const growSelection: Command = view => {
  const before = view.state.selection
  if (!selectParentSyntax(view)) return false
  const after = view.state.selection
  if (!after.eq(before)) {
    const history = growHistory.get(view) ?? []
    // Moved or clicked since the last grow: start a new history
    const last = history[history.length - 1]
    const steps = last && last.to.eq(before) ? history : []
    steps.push({ from: before, to: after })
    growHistory.set(view, steps)
  }
  return true
}

const shrinkSelection: Command = view => {
  const history = growHistory.get(view)
  const last = history?.[history.length - 1]
  // Only undo a grow while the selection is still what it grew to
  if (!history || !last || !last.to.eq(view.state.selection)) return false
  history.pop()
  view.dispatch({ selection: last.from, scrollIntoView: true, userEvent: 'select' })
  return true
}

// Alt+click adds a cursor at the click, as in VS Code
const altClickAddsCursor = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (!enabled || !event.altKey || event.shiftKey || event.button !== 0) {
      return false
    }
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) return false
    event.preventDefault()
    view.dispatch({
      selection: view.state.selection.addRange(EditorSelection.cursor(pos)),
      userEvent: 'select.pointer',
    })
    view.focus()
    return true
  },
})

const showShortcuts: Command = () => {
  window.dispatchEvent(new CustomEvent(SHOW_SHORTCUTS_EVENT))
  return true
}

// Returning false lets the key fall through to Vim, Emacs or the stock
// binding when VS Code keys are off
const whenOn =
  (command: Command): Command =>
  (view: EditorView) =>
    enabled && command(view)

export const vscodeKeymap = () =>
  // Prec.highest: above the stock Go to line (Prec.high) and the search
  // keymap's find-next
  Prec.highest([
    keymap.of([
      { key: 'Mod-l', run: whenOn(expandLineSelection) },
      { key: 'Mod-Shift-l', run: whenOn(selectSelectionMatches) },
      { key: 'Ctrl-g', run: whenOn(gotoLine) },
      { key: 'Mod-d', run: whenOn(addNextOccurrence) },
      { key: 'Mod-k Mod-d', run: whenOn(skipOccurrence) },
      { key: 'Mod-k Mod-o', run: whenOn(foldAll) },
      { key: 'Mod-k Mod-j', run: whenOn(unfoldAll) },
      { key: 'Shift-Alt-ArrowRight', run: whenOn(growSelection) },
      { key: 'Shift-Alt-ArrowLeft', run: whenOn(shrinkSelection) },
      { key: 'Shift-F8', run: whenOn(previousDiagnostic) },
      { key: 'Mod-k Mod-s', run: whenOn(showShortcuts) },
    ]),
    altClickAddsCursor,
    // Shift+Alt+drag selects a column (plain Alt+drag stays Overleaf's
    // column selection when VS Code keys are off)
    rectangularSelection({
      eventFilter: event => enabled && event.altKey && event.shiftKey,
    }),
  ])
