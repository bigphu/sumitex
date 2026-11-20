/**
 * "Edit this block": the Outline's ✎ and the palette ask, the editor side
 * (block-editor.tsx, next to the editor) opens the pop-up. A window event,
 * as the two sit in different parts of the page.
 */
export type EditKind = 'table' | 'list' | 'any'
export type EditRequest = { pos: number; kind: EditKind }

const EVENT = 'sumitex:edit-block'

export const requestEdit = (pos: number, kind: EditKind = 'any') =>
  window.dispatchEvent(new CustomEvent<EditRequest>(EVENT, { detail: { pos, kind } }))

export function onEditRequest(listener: (request: EditRequest) => void) {
  const handle = (event: Event) => listener((event as CustomEvent<EditRequest>).detail)
  window.addEventListener(EVENT, handle)
  return () => window.removeEventListener(EVENT, handle)
}

/** Which block kinds have a pop-up so far */
export const EDITABLE_KINDS = new Set(['table', 'list'])
