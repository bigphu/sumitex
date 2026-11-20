/**
 * Lets React code outside CodeMirror follow the editor: every update
 * (typing, undo, a collaborator's edit) reaches the listeners. Used by
 * the Outline's edit pop-ups (outline/edit/block-editor.tsx).
 */
import { EditorView, ViewUpdate } from '@codemirror/view'

const listeners = new Set<(update: ViewUpdate) => void>()

export function subscribeEditorUpdates(listener: (update: ViewUpdate) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const docUpdates = () =>
  EditorView.updateListener.of(update => {
    for (const listener of listeners) listener(update)
  })
