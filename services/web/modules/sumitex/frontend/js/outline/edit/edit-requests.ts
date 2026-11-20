/**
 * "Edit this block": the Outline's ✎, the editor's button, Ctrl+K E and the
 * palette ask; the editor side (block-editor.tsx, next to the editor) opens
 * the pop-up. A window event, as the two sit in different parts of the
 * page. The Outline knows sections by line, the rest by position.
 */
export type EditKind = 'table' | 'list' | 'equation' | 'section' | 'any'
export type EditRequest = { pos?: number; line?: number; kind: EditKind }

const EVENT = 'sumitex:edit-block'

const send = (detail: EditRequest) =>
  window.dispatchEvent(new CustomEvent<EditRequest>(EVENT, { detail }))

export const requestEdit = (pos: number, kind: EditKind = 'any') => send({ pos, kind })

/** The section (or other block) whose first line is `line` (1-based) */
export const requestEditLine = (line: number, kind: EditKind = 'any') => send({ line, kind })

export function onEditRequest(listener: (request: EditRequest) => void) {
  const handle = (event: Event) => listener((event as CustomEvent<EditRequest>).detail)
  window.addEventListener(EVENT, handle)
  return () => window.removeEventListener(EVENT, handle)
}

/** Which Outline block kinds have a pop-up so far */
export const EDITABLE_KINDS = new Set(['table', 'list', 'equation'])
