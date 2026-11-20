/**
 * The table edit pop-up's model (mockup frame 14): a table read from the
 * LaTeX, and each action as one edit to that LaTeX. The pop-up never keeps
 * its own copy: it reads the table again after every change, so typing in
 * the editor, undo and collaborators' edits all show at once.
 *
 * - Cells, rows and columns of a tabular (tabularx, longtable… as in
 *   editor/table-columns.ts), with the caption and label of the table
 *   float around it.
 * - Rows move and delete only when each sits on a line of its own, so a
 *   rule (\hline) on its own line stays where it is.
 * - A bare tabular that gets a caption or label is wrapped in a table
 *   float, as a caption needs one.
 */
import type { EditorState, TransactionSpec } from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { getEnvironmentName } from '@/features/source-editor/utils/tree-operations/environments'
import {
  moveColumnTo,
  parseSpec,
  tableAt,
  type Row,
  type SpecToken,
} from '../../editor/table-columns'

type Span = { from: number; to: number }

const TABULARS = new Set([
  'tabular',
  'tabular*',
  'tabularx',
  'tabulary',
  'longtable',
  'array',
])
const FLOATS = new Set(['table', 'table*'])

export type TableRow = {
  cells: string[]
  /** On a line of its own, so it can move and be deleted */
  single: boolean
  raw: Row
}

export type TableModel = {
  /** The tabular environment, \begin to \end */
  tabular: Span
  /** Where its body ends (\end{tabular}) */
  bodyTo: number
  spec: Span
  tokens: SpecToken[]
  columns: number
  rows: TableRow[]
  float: Span | null
  caption: { text: string; content: Span } | null
  label: { text: string; content: Span } | null
  /** Rules written with \hline, which booktabs would replace */
  hlines: Span[]
  merged: boolean
}

export type Edit = TransactionSpec | { error: string }

const tree = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)

function environmentsAround(state: EditorState, pos: number) {
  let tabular: SyntaxNode | null = null
  let float: SyntaxNode | null = null
  for (
    let node: SyntaxNode | null = tree(state).resolveInner(pos, 1);
    node;
    node = node.parent
  ) {
    if (!node.type.is('$Environment')) continue
    const name = getEnvironmentName(node, state) ?? ''
    if (!tabular && !float && TABULARS.has(name)) tabular = node
    else if (!float && FLOATS.has(name)) float = node
  }
  // On a float: the first tabular in it
  if (!tabular && float) {
    const cursor = float.cursor()
    cursor.iterate(node => {
      if (tabular) return false
      if (
        node.type.is('$Environment') &&
        TABULARS.has(getEnvironmentName(node.node, state) ?? '')
      ) {
        tabular = node.node
        return false
      }
    })
  }
  return { tabular: tabular as SyntaxNode | null, float }
}

/** The caption and label written directly in the float */
function captionAndLabel(state: EditorState, float: SyntaxNode | null) {
  let caption: TableModel['caption'] = null
  let label: TableModel['label'] = null
  if (!float) return { caption, label }
  const inner = (node: SyntaxNode | null) =>
    node && node.to - node.from >= 2
      ? { from: node.from + 1, to: node.to - 1 }
      : null
  float.cursor().iterate(node => {
    // Not inside the tabular or another environment
    if (
      node.type.is('$Environment') &&
      (node.from !== float.from || node.to !== float.to)
    ) {
      return false
    }
    if (!caption && node.type.is('Caption')) {
      const content = inner(node.node.getChild('TextArgument'))
      if (content) caption = { text: state.sliceDoc(content.from, content.to), content }
    }
    if (!label && node.type.is('Label')) {
      const content = inner(
        node.node.getChild('LabelArgument')?.getChild('ShortTextArgument') ?? null
      )
      if (content) label = { text: state.sliceDoc(content.from, content.to), content }
    }
  })
  return { caption, label }
}

/** The table at `pos` (on its float or its tabular), or null */
export function readTable(state: EditorState, pos: number): TableModel | null {
  const { tabular, float } = environmentsAround(state, pos)
  if (!tabular) return null
  const end = tabular.getChild('EndEnv')
  const parsed = tableAt(state, tabular.from + 1, { keepEmpty: true })
  if (!parsed || 'error' in parsed || !end) return null
  const tokens = parseSpec(state.sliceDoc(parsed.spec.from, parsed.spec.to))
  if ('error' in tokens) return null

  const rows = parsed.rows.map(raw => {
    const start = raw.cells[0].content.from
    const stop = raw.cells[raw.cells.length - 1].to
    const line = state.doc.lineAt(start)
    const single =
      line.number === state.doc.lineAt(stop).number &&
      state.sliceDoc(line.from, start).trim() === ''
    return {
      cells: raw.cells.map(cell =>
        state.sliceDoc(cell.content.from, cell.content.to)
      ),
      single,
      raw,
    }
  })

  const body = state.sliceDoc(parsed.spec.to + 1, end.from)
  const hlines = [...body.matchAll(/\\hline(?![A-Za-z])/g)].map(match => ({
    from: parsed.spec.to + 1 + match.index!,
    to: parsed.spec.to + 1 + match.index! + match[0].length,
  }))

  return {
    tabular: { from: tabular.from, to: tabular.to },
    bodyTo: end.from,
    spec: parsed.spec,
    tokens,
    columns: tokens.filter(token => token.column).length,
    rows,
    float: float ? { from: float.from, to: float.to } : null,
    ...captionAndLabel(state, float),
    hlines,
    merged: rows.some(row => row.cells.some(cell => /\\multicolumn(?![A-Za-z])/.test(cell))),
  }
}

const respec = (model: TableModel, tokens: SpecToken[]) => ({
  from: model.spec.from,
  to: model.spec.to,
  insert: tokens.map(token => token.text).join(''),
})

const indentOf = (state: EditorState, pos: number) =>
  /^[ \t]*/.exec(state.doc.lineAt(pos).text)![0]

// ------------------------------------------------------------------- cells

export function setCell(model: TableModel, row: number, column: number, text: string): Edit {
  const cell = model.rows[row]?.raw.cells[column]
  if (!cell) return { error: 'That cell isn’t there any more.' }
  return {
    changes: { from: cell.content.from, to: cell.content.to, insert: text },
    userEvent: 'input.sumitex-table',
  }
}

// -------------------------------------------------------------------- rows

/** Where a row's \\ (and \\*, \\[2pt]) ends, or null when it has none */
function rowEnd(state: EditorState, row: Row) {
  const at = row.cells[row.cells.length - 1].to
  if (state.sliceDoc(at, at + 2) !== '\\\\') return null
  let j = at + 2
  if (state.sliceDoc(j, j + 1) === '*') j++
  const rest = state.sliceDoc(j, j + 40)
  const length = /^\s*\[[^\]\n]*\]/.exec(rest)
  return length ? j + length[0].length : j
}

export function addRow(state: EditorState, model: TableModel): Edit {
  const last = model.rows[model.rows.length - 1]
  // Three empty cells: & & \\
  const empty = new Array(Math.max(1, model.columns - 1)).fill('&').join(' ') + ' \\\\'
  if (!last) {
    // No data row yet: right after the spec's line
    const line = state.doc.lineAt(model.spec.to)
    return {
      changes: { from: line.to, insert: `\n  ${empty}` },
      userEvent: 'input.sumitex-table',
    }
  }
  const indent = indentOf(state, last.raw.cells[0].content.from)
  const end = rowEnd(state, last.raw)
  if (end === null) {
    // The last row has no \\ yet: give it one, then the new row
    const at = last.raw.cells[last.raw.cells.length - 1].content.to
    return {
      changes: { from: at, insert: ` \\\\\n${indent}${empty}` },
      userEvent: 'input.sumitex-table',
    }
  }
  return {
    changes: { from: end, insert: `\n${indent}${empty}` },
    userEvent: 'input.sumitex-table',
  }
}

export function deleteRow(state: EditorState, model: TableModel, index: number): Edit {
  const row = model.rows[index]
  if (!row) return { error: 'That row isn’t there any more.' }
  if (!row.single) return { error: 'This row shares its line with other text; delete it in the editor.' }
  if (model.rows.length < 2) return { error: 'A table needs at least one row.' }
  const line = state.doc.lineAt(row.raw.cells[0].content.from)
  return {
    changes: { from: line.from, to: Math.min(line.to + 1, state.doc.length) },
    userEvent: 'delete.sumitex-table',
  }
}

export function moveRow(state: EditorState, model: TableModel, index: number, target: number): Edit {
  if (index === target) return {}
  const low = Math.min(index, target)
  const high = Math.max(index, target)
  const rows = model.rows.slice(low, high + 1)
  if (rows.some(row => !row.single)) {
    return { error: 'These rows share lines with other text; move them in the editor.' }
  }
  const lines = model.rows.map(row => state.doc.lineAt(row.raw.cells[0].content.from))
  const texts = lines.map(line => line.text)
  const [moving] = texts.splice(index, 1)
  texts.splice(target, 0, moving)
  const changes = []
  for (let k = low; k <= high; k++) {
    if (texts[k] !== lines[k].text) {
      changes.push({ from: lines[k].from, to: lines[k].to, insert: texts[k] })
    }
  }
  return { changes, userEvent: 'move.sumitex-table' }
}

// ----------------------------------------------------------------- columns

export function addColumn(state: EditorState, model: TableModel): Edit {
  const tokens = [...model.tokens]
  const places = tokens.flatMap((token, i) => (token.column ? [i] : []))
  const last = places[places.length - 1]
  // What sits between the last two columns (| or nothing) goes in too
  const between =
    places.length > 1
      ? tokens.slice(places[places.length - 2] + 1, last).map(t => t.text).join('')
      : ''
  tokens.splice(last + 1, 0, { text: `${between}l`, column: true })
  const changes = [respec(model, tokens)]
  for (const row of model.rows) {
    const cell = row.raw.cells[row.raw.cells.length - 1]
    changes.push({ from: cell.content.to, to: cell.content.to, insert: ' &' })
  }
  return { changes, userEvent: 'input.sumitex-table' }
}

export function deleteColumn(model: TableModel, column: number): Edit {
  if (model.merged) {
    return { error: 'This table has merged cells (\\multicolumn); delete columns in the editor.' }
  }
  if (model.columns <= 2) return { error: 'A table here needs at least two columns.' }
  const tokens = [...model.tokens]
  const places = tokens.flatMap((token, i) => (token.column ? [i] : []))
  const at = places[column]
  if (at === undefined) return { error: 'That column isn’t there any more.' }
  // |l|c|r| without c is |l|r|, not |l||r|
  const before = tokens[at - 1]
  const after = tokens[at + 1]
  const drop = before && after && !before.column && !after.column && before.text === after.text ? 2 : 1
  tokens.splice(drop === 2 ? at - 1 : at, drop)
  const changes = [respec(model, tokens)]
  for (const row of model.rows) {
    const cells = row.raw.cells
    if (cells.length <= column) continue
    if (column === 0) {
      changes.push({ from: cells[0].content.from, to: cells[1].content.from, insert: '' })
    } else {
      changes.push({ from: cells[column - 1].to, to: cells[column].to, insert: '' })
    }
  }
  return { changes, userEvent: 'delete.sumitex-table' }
}

export const moveColumn = (
  state: EditorState,
  model: TableModel,
  column: number,
  target: number
): Edit => moveColumnTo(state, model.spec.from, column, target)

/** The alignment letter of a plain l, c or r column, else null */
export function alignmentOf(model: TableModel, column: number) {
  const token = model.tokens.filter(t => t.column)[column]
  return token && /^[lcr]$/.test(token.text) ? token.text : null
}

export function setAlignment(model: TableModel, column: number, letter: 'l' | 'c' | 'r'): Edit {
  if (!alignmentOf(model, column)) return { error: 'This column has its own format; change it in the editor.' }
  let seen = -1
  const tokens = model.tokens.map(token =>
    token.column && ++seen === column ? { ...token, text: letter } : token
  )
  return { changes: [respec(model, tokens)], userEvent: 'input.sumitex-table' }
}

// --------------------------------------------------------- caption, label

/** A bare tabular wrapped in a table float, with these lines on top */
function wrapInFloat(state: EditorState, model: TableModel, lines: string[]): Edit {
  const first = state.doc.lineAt(model.tabular.from)
  const last = state.doc.lineAt(model.tabular.to)
  const indent = indentOf(state, model.tabular.from)
  const top = [
    `${indent}\\begin{table}[htbp]`,
    `${indent}  \\centering`,
    ...lines.map(line => `${indent}  ${line}`),
  ].join('\n')
  return {
    changes: [
      { from: first.from, insert: `${top}\n` },
      { from: last.to, insert: `\n${indent}\\end{table}` },
    ],
    userEvent: 'input.sumitex-table',
  }
}

/** A line of its own just above the tabular, inside the float */
function lineAboveTabular(state: EditorState, model: TableModel, text: string): Edit {
  const line = state.doc.lineAt(model.tabular.from)
  return {
    changes: { from: line.from, insert: `${indentOf(state, model.tabular.from)}${text}\n` },
    userEvent: 'input.sumitex-table',
  }
}

export function setCaption(state: EditorState, model: TableModel, text: string): Edit {
  if (model.caption) {
    return {
      changes: { from: model.caption.content.from, to: model.caption.content.to, insert: text },
      userEvent: 'input.sumitex-table',
    }
  }
  if (!text) return {}
  // Tables take their caption above, and the label right after it
  if (!model.float) return wrapInFloat(state, model, [`\\caption{${text}}`])
  if (model.label) {
    const line = state.doc.lineAt(model.label.content.from)
    return {
      changes: { from: line.from, insert: `${indentOf(state, line.from)}\\caption{${text}}\n` },
      userEvent: 'input.sumitex-table',
    }
  }
  return lineAboveTabular(state, model, `\\caption{${text}}`)
}

/** A label LaTeX takes: no spaces, braces or other special characters */
export const cleanLabel = (text: string) => text.replace(/\s+/g, '-').replace(/[{}\\%#~$^&]/g, '')

export function setLabel(state: EditorState, model: TableModel, raw: string): Edit {
  const text = cleanLabel(raw)
  if (model.label) {
    return {
      changes: { from: model.label.content.from, to: model.label.content.to, insert: text },
      userEvent: 'input.sumitex-table',
    }
  }
  if (!text) return {}
  if (!model.float) return wrapInFloat(state, model, [`\\label{${text}}`])
  if (model.caption) {
    // Right after the caption's closing brace
    return {
      changes: { from: model.caption.content.to + 1, insert: `\\label{${text}}` },
      userEvent: 'input.sumitex-table',
    }
  }
  return lineAboveTabular(state, model, `\\label{${text}}`)
}

// -------------------------------------------------------------- booktabs

/**
 * \hline rules to booktabs (\toprule, \midrule, \bottomrule), and the
 * vertical rules out of the spec, as booktabs tables have none. The
 * package is the caller's to add.
 */
export function toBooktabs(model: TableModel): Edit {
  if (!model.hlines.length) return { error: 'This table has no \\hline rules to replace.' }
  const last = model.hlines.length - 1
  const changes = model.hlines.map((span, i) => ({
    from: span.from,
    to: span.to,
    insert: i === 0 ? '\\toprule' : i === last && last > 0 ? '\\bottomrule' : '\\midrule',
  }))
  const tokens = model.tokens.filter(token => token.column || token.text !== '|')
  if (tokens.length !== model.tokens.length) changes.push(respec(model, tokens))
  return { changes, userEvent: 'input.sumitex-table' }
}
