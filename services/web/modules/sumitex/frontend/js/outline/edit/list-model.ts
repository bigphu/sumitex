/**
 * The list edit pop-up's model (mockup frame 15): a list read from the
 * LaTeX, and each action as one edit to it, read again after every change
 * (like table-model.ts).
 *
 * - Lists written one \item per line (editor/list-items.ts).
 * - An item's text is editable in the pop-up when the item is one line;
 *   a longer one (wrapped lines, a sub-list) shows its first words and is
 *   edited in the editor. Every item moves and deletes.
 * - The type switch renames the environment: itemize, enumerate,
 *   description. An \item[label] keeps its label.
 */
import type { EditorState } from '@codemirror/state'
import type { SyntaxNode } from '@lezer/common'
import { getEnvironmentName } from '@/features/source-editor/utils/tree-operations/environments'
import { listAt, moveListItemTo, type ItemRange } from '../../editor/list-items'
import type { Edit } from './table-model'

export const LIST_TYPES = ['itemize', 'enumerate', 'description'] as const
export type ListType = (typeof LIST_TYPES)[number]

export type ListItem = {
  range: ItemRange
  /** The text after \item (and its [label]), when the item is one line */
  text: string
  editable: boolean
  /** Where that text sits */
  content: { from: number; to: number }
}

export type ListModel = {
  list: { from: number; to: number }
  type: string
  /** {itemize} in \begin and \end */
  names: { from: number; to: number }[]
  items: ListItem[]
  /** Where a new item goes: the start of the \end line */
  endLine: number
}

// Spaces and tabs only: an empty item's line break isn't part of it
const ITEM = /^([ \t]*\\item(?![A-Za-z])[ \t]*(?:\[[^\]\n]*\])?[ \t]?)/

function nameSpans(node: SyntaxNode) {
  return ['BeginEnv', 'EndEnv'].flatMap(part => {
    const group = node.getChild(part)?.getChild('EnvNameGroup')
    return group && group.to - group.from >= 2
      ? [{ from: group.from + 1, to: group.to - 1 }]
      : []
  })
}

/** The list at `pos`, or null */
export function readList(state: EditorState, pos: number): ListModel | null {
  const found = listAt(state, pos)
  if (!found) return null
  const { node, items } = found
  const end = node.getChild('EndEnv')
  if (!end) return null
  return {
    list: { from: node.from, to: node.to },
    type: getEnvironmentName(node, state) ?? 'itemize',
    names: nameSpans(node),
    endLine: state.doc.lineAt(end.from).from,
    items: items.map(range => {
      const text = state.sliceDoc(range.from, range.to)
      const head = ITEM.exec(text)?.[1] ?? ''
      const firstLine = text.split('\n')[0]
      // One line: the item's text is its whole first line
      const editable = text.replace(/\n$/, '') === firstLine
      return {
        range,
        text: firstLine.slice(head.length),
        editable,
        content: {
          from: range.from + head.length,
          to: range.from + firstLine.length,
        },
      }
    }),
  }
}

export function setItemText(model: ListModel, index: number, text: string): Edit {
  const item = model.items[index]
  if (!item?.editable) return { error: 'Edit this item in the editor.' }
  return {
    changes: { from: item.content.from, to: item.content.to, insert: text.replace(/\n/g, ' ') },
    userEvent: 'input.sumitex-list',
  }
}

export function addItem(state: EditorState, model: ListModel, text = ''): Edit {
  const last = model.items[model.items.length - 1]
  const indent = last
    ? /^[ \t]*/.exec(state.doc.lineAt(last.range.from).text)![0]
    : '  '
  return {
    changes: { from: model.endLine, insert: `${indent}\\item ${text}\n` },
    userEvent: 'input.sumitex-list',
  }
}

export function deleteItem(model: ListModel, index: number): Edit {
  const item = model.items[index]
  if (!item) return { error: 'That item isn’t there any more.' }
  if (model.items.length < 2) return { error: 'A list needs at least one item.' }
  return {
    changes: { from: item.range.from, to: item.range.to },
    userEvent: 'delete.sumitex-list',
  }
}

export const moveItem = (
  state: EditorState,
  model: ListModel,
  index: number,
  target: number
): Edit =>
  moveListItemTo(
    state,
    model.items.map(item => item.range),
    index,
    target
  ) ?? {}

export function setListType(model: ListModel, type: ListType): Edit {
  if (model.type === type) return {}
  return {
    changes: model.names.map(span => ({ ...span, insert: type })),
    userEvent: 'input.sumitex-list',
  }
}
