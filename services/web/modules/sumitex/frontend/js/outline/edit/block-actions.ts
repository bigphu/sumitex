/**
 * The Outline's ⋯ menu (sumitex-outline.tsx) asks; this runs it in the
 * editor (block-editor.tsx listens): insert or copy a reference to the
 * block, duplicate it, delete it; for a section, promote, demote, move up
 * or down. Each is one change, so Ctrl+Z takes it back.
 */
import type { EditorView } from '@codemirror/view'
import { flashMessage } from '../../editor/flash-message'
import { hasOwnPreamble } from '../../editor/symbols/symbol-package'
import { parseFile, preambleOf } from '../../diagnostics/preamble'
import { getProjectPreamble } from '../../diagnostics/preamble-store'
import { withLoaded } from '../../diagnostics/packages'
import { blockAt } from './block-at'
import type { EditKind } from './edit-requests'
import { requestEdit } from './edit-requests'
import {
  deleteBlock,
  duplicateBlock,
  referenceText,
  swapSections,
  type Edit,
} from './actions-model'
import { readTable } from './table-model'
import { readList } from './list-model'
import { readEquation } from './equation-model'
import { readSection, setLevel, LEVELS } from './section-model'
import { readFigure } from './figure-model'
import { readTheorem } from './theorem-model'
import { readNote } from './note-model'
import { readCode } from './code-model'
import type { Span } from './parts'

export type ActionName =
  | 'insert-ref'
  | 'copy-ref'
  | 'duplicate'
  | 'delete'
  | 'promote'
  | 'demote'
  | 'move-up'
  | 'move-down'

export type ActionRequest = { pos?: number; line?: number; kind: EditKind; action: ActionName }

const EVENT = 'sumitex:block-action'

export const requestAction = (request: ActionRequest) =>
  window.dispatchEvent(new CustomEvent<ActionRequest>(EVENT, { detail: request }))

export function onActionRequest(listener: (request: ActionRequest) => void) {
  const handle = (event: Event) => listener((event as CustomEvent<ActionRequest>).detail)
  window.addEventListener(EVENT, handle)
  return () => window.removeEventListener(EVENT, handle)
}

type Target = { kind: string; range: Span; label: string | null }

/** The block at `at`: its kind (for the reference), range and label */
function blockTarget(view: EditorView, at: number, kind: EditKind): Target | null {
  const state = view.state
  const found = blockAt(state, at, kind)
  if (!found) return null
  const pos = found.anchor
  switch (found.kind) {
    case 'table': {
      const m = readTable(state, pos)
      return m && { kind: 'table', range: m.float ?? m.tabular, label: m.label?.text ?? null }
    }
    case 'list': {
      const m = readList(state, pos)
      return m && { kind: 'list', range: m.list, label: null }
    }
    case 'equation': {
      const m = readEquation(state, pos)
      return m && { kind: 'equation', range: m.range, label: m.label?.text ?? null }
    }
    case 'figure': {
      const m = readFigure(state, pos)
      return m && { kind: 'figure', range: m.range, label: m.label?.text ?? null }
    }
    case 'theorem': {
      const m = readTheorem(state, pos)
      return m && { kind: m.type, range: m.range, label: m.label?.text ?? null }
    }
    case 'note': {
      const m = readNote(state, pos)
      return m && { kind: 'note', range: m.range, label: null }
    }
    case 'code': {
      const m = readCode(state, pos)
      return m && {
        kind: m.name.startsWith('algorithm') ? 'algorithm' : 'code',
        range: m.float ?? m.range,
        label: m.label?.text ?? null,
      }
    }
    case 'section': {
      const m = readSection(state, pos)
      return m && { kind: LEVELS[m.level], range: m.range, label: m.label?.text ?? null }
    }
  }
  return null
}

/** The packages loaded where this file is compiled */
function loadedPackages(text: string): ReadonlySet<string> {
  if (hasOwnPreamble(text)) return withLoaded(parseFile(preambleOf(text)).packages)
  return getProjectPreamble().preamble?.loaded ?? new Set()
}

const apply = (view: EditorView, edit: Edit) => {
  if ('error' in edit) {
    flashMessage(view, edit.error as string)
    return false
  }
  view.dispatch(edit)
  view.focus()
  return true
}

export function runAction(view: EditorView, request: ActionRequest) {
  const state = view.state
  const at =
    request.line !== undefined
      ? state.doc.line(Math.min(request.line, state.doc.lines)).from
      : (request.pos ?? state.selection.main.head)
  const target = blockTarget(view, at, request.kind)
  if (!target) {
    flashMessage(view, 'That block isn’t there any more.')
    return
  }
  const name = target.kind.replace(/\*$/, '')

  switch (request.action) {
    case 'insert-ref':
    case 'copy-ref': {
      if (!target.label) {
        flashMessage(view, `This ${name} has no label yet; give it one with ✎ Edit.`)
        requestEdit(at, request.kind)
        return
      }
      const text = referenceText(target.kind, target.label, loadedPackages(state.doc.toString()))
      if (request.action === 'copy-ref') {
        void navigator.clipboard?.writeText(text)
        flashMessage(view, `Copied ${text}`)
        return
      }
      const { from, to } = state.selection.main
      // A space before it when it would touch a word
      const before = state.sliceDoc(from - 1, from)
      const insert = (/\w/.test(before) ? ' ' : '') + text
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length },
        scrollIntoView: true,
        userEvent: 'input.sumitex-reference',
      })
      view.focus()
      return
    }
    case 'duplicate':
      apply(view, duplicateBlock(state, target.range))
      return
    case 'delete':
      if (apply(view, deleteBlock(state, target.range))) {
        flashMessage(view, `Deleted the ${name} · Ctrl+Z brings it back`)
      }
      return
  }

  // Section actions
  const section = readSection(state, at)
  if (!section) return
  switch (request.action) {
    case 'promote':
      apply(view, setLevel(section, section.level - 1))
      return
    case 'demote':
      apply(view, setLevel(section, section.level + 1))
      return
    case 'move-up':
      if (!section.previous) flashMessage(view, 'This is already the first at its level here.')
      else apply(view, swapSections(state, section.previous, section.range))
      return
    case 'move-down':
      if (!section.next) flashMessage(view, 'This is already the last at its level here.')
      else apply(view, swapSections(state, section.range, section.next))
  }
}
