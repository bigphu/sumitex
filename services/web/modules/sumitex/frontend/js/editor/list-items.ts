/**
 * Moving a whole list item (guide Phase 6, features list 9, step 1):
 * Alt+↑/↓ on a line inside an \item of itemize, enumerate or description
 * swaps the item with its neighbour, its wrapped lines, sub-lists and
 * \item[label] included. Anywhere else Alt+↑/↓ stays the plain "move
 * line", so this falls through.
 *
 * - An item runs from the line of its \item to the line of the next \item
 *   of the same list, or to the line of \end{…}.
 * - The syntax tree finds the items, so an \item in a comment or in
 *   verbatim, or one in a nested list, is never taken for one of this list.
 * - In a nested list, the innermost list whose item holds the cursor moves.
 * - One move is one undo step.
 * - At the first or last item the key does nothing, so an item never
 *   leaves its list.
 * - Only lists written one \item per line are handled; anything else falls
 *   back to moving lines.
 */
import {
  EditorSelection,
  EditorState,
  TransactionSpec,
} from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import { SyntaxNode } from '@lezer/common'

export type ItemRange = { from: number; to: number }

export type ListItems = {
  /** The list environment, \begin to \end */
  list: { from: number; to: number }
  items: ItemRange[]
  /** Which item holds the selection */
  index: number
}

const tree = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)

/** Only spaces and tabs between a and b */
const blank = (state: EditorState, a: number, b: number) =>
  /^[ \t]*$/.test(state.sliceDoc(a, b))

/** The items of one list environment, or null if they aren't one per line */
function itemsOf(state: EditorState, list: SyntaxNode): ItemRange[] | null {
  const end = list.getChild('EndEnv')
  if (!end) return null
  const starts: number[] = []
  list.cursor().iterate(node => {
    // Another environment inside the list (a nested list, a figure…):
    // its \item lines belong to it
    if (
      node.type.is('$Environment') &&
      (node.from !== list.from || node.to !== list.to)
    ) {
      return false
    }
    if (node.type.is('Item')) starts.push(node.from)
  })
  if (!starts.length) return null

  const lineStarts: number[] = []
  for (const at of starts) {
    const line = state.doc.lineAt(at)
    if (!blank(state, line.from, at)) return null
    lineStarts.push(line.from)
  }
  const endLine = state.doc.lineAt(end.from)
  if (!blank(state, endLine.from, end.from)) return null
  if (endLine.from <= lineStarts[lineStarts.length - 1]) return null

  return lineStarts.map((from, i) => ({
    from,
    to: i + 1 < lineStarts.length ? lineStarts[i + 1] : endLine.from,
  }))
}

/** The list item that holds the whole selection, innermost list first */
export function listItemsAt(state: EditorState): ListItems | null {
  const { ranges } = state.selection
  const head = state.selection.main.head
  for (
    let node: SyntaxNode | null = tree(state).resolveInner(head, 1);
    node;
    node = node.parent
  ) {
    if (!node.type.is('ListEnvironment')) continue
    const items = itemsOf(state, node)
    if (!items) continue
    const index = items.findIndex(item =>
      ranges.every(range => range.from >= item.from && range.to <= item.to)
    )
    if (index >= 0) {
      return { list: { from: node.from, to: node.to }, items, index }
    }
  }
  return null
}

/**
 * The edit that moves the item at the selection one place up or down;
 * 'edge' at the first or last item, null when the selection isn't in an
 * item (the caller then lets the key move lines as usual)
 */
export function moveListItem(
  state: EditorState,
  direction: -1 | 1
): TransactionSpec | 'edge' | null {
  const found = listItemsAt(state)
  if (!found) return null
  const { items, index } = found
  const other = index + direction
  if (other < 0 || other >= items.length) return 'edge'

  const [first, second] =
    direction < 0 ? [items[other], items[index]] : [items[index], items[other]]
  const firstText = state.sliceDoc(first.from, first.to)
  const secondText = state.sliceDoc(second.from, second.to)
  // The moving item's text shifts by the other item's length
  const shift =
    direction < 0 ? -(first.to - first.from) : second.to - second.from

  return {
    changes: {
      from: first.from,
      to: second.to,
      insert: secondText + firstText,
    },
    selection: EditorSelection.create(
      state.selection.ranges.map(range =>
        EditorSelection.range(range.anchor + shift, range.head + shift)
      ),
      state.selection.mainIndex
    ),
    scrollIntoView: true,
    userEvent: 'move.line',
  }
}
