/**
 * Which block an edit request is about: the innermost equation, list or
 * table around a position, else the section whose command is on its line.
 * Shared by the pop-up (block-editor.tsx) and the editor's button.
 */
import type { EditorState } from '@codemirror/state'
import type { EditKind } from './edit-requests'
import { readTable } from './table-model'
import { readList } from './list-model'
import { readEquation } from './equation-model'
import { readSection } from './section-model'

export type OpenKind = 'table' | 'list' | 'equation' | 'section'
export type Open = { anchor: number; kind: OpenKind }

/**
 * Which block is at `pos`: the innermost equation, list or table; else
 * the section whose command is on that line
 */
export function blockAt(state: EditorState, pos: number, kind: EditKind): Open | null {
  const want = (k: OpenKind) => kind === 'any' || kind === k
  const found: Open[] = []
  const table = want('table') ? readTable(state, pos) : null
  if (table) found.push({ anchor: table.tabular.from, kind: 'table' })
  const list = want('list') ? readList(state, pos) : null
  if (list) found.push({ anchor: list.list.from, kind: 'list' })
  const equation = want('equation') ? readEquation(state, pos) : null
  if (equation) found.push({ anchor: equation.range.from, kind: 'equation' })
  if (found.length) return found.sort((a, b) => b.anchor - a.anchor)[0]
  const section = want('section') ? readSection(state, pos) : null
  return section ? { anchor: section.ctrl.from, kind: 'section' } : null
}

