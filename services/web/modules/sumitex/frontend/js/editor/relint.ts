/**
 * Running a linter again without an edit: when a setting changes (Settings
 * → Checks) or the main file's preamble does. CodeMirror's forceLinting
 * only hurries a check an edit already asked for, so a linter given
 * `needsRefresh: needsRelint` also treats this effect as such a request.
 */
import { StateEffect } from '@codemirror/state'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import { forceLinting } from '@codemirror/lint'

const relintEffect = StateEffect.define<null>()

export const needsRelint = (update: ViewUpdate) =>
  update.transactions.some(tr => tr.effects.some(effect => effect.is(relintEffect)))

/** Check this editor again now */
export function relint(view: EditorView) {
  // Never from inside another update (a store can change mid-dispatch)
  queueMicrotask(() => {
    if (!view.dom.isConnected) return
    view.dispatch({ effects: relintEffect.of(null) })
    forceLinting(view)
  })
}
