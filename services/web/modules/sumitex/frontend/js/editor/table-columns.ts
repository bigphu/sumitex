/**
 * Moving a table column (guide Phase 6, features list 10, step 1): with
 * the cursor in a cell, the palette's "Table: Move column left/right"
 * moves that column one place, in every row, and moves its entry in the
 * column spec with it: {l c r} becomes {c l r}.
 *
 * - Works in tabular, tabular*, tabularx, tabulary, longtable and array.
 * - Rules stay put: \hline, \toprule, \midrule, \cline… belong between rows
 *   and don't move. Row endings (\\[2pt], \\*) stay with their row.
 * - \& is text, not a cell break; braces and comments are respected.
 * - A spec written with *{3}{l} is spelled out (l l l) so one entry can move.
 * - Rows that aren't data (a longtable caption, \endhead…) are left alone.
 * - Refused, with a message saying why: a merged cell (\multicolumn) in a
 *   row the move touches, a row with too few cells, a spec that doesn't
 *   have the column.
 * - One move is one undo step.
 */
import {
  EditorSelection,
  EditorState,
  TransactionSpec,
} from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import { SyntaxNode } from '@lezer/common'
import { getEnvironmentName } from '@/features/source-editor/utils/tree-operations/environments'

const TABLE_ENVIRONMENTS = new Set([
  'tabular',
  'tabular*',
  'tabularx',
  'tabulary',
  'longtable',
  'array',
])
// These take a width before the column spec
const WIDTH_FIRST = new Set(['tabular*', 'tabularx', 'tabulary'])

type Span = { from: number; to: number }
type Cell = Span & { content: Span }
type Row = { cells: Cell[]; line: number }

export type Table = {
  name: string
  spec: Span
  rows: Row[]
}

const tree = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)

/** The {…} group starting at `at` (after spaces), with its end */
function group(text: string, at: number, open = '{', close = '}') {
  let i = at
  while (text[i] === ' ' || text[i] === '\t' || text[i] === '\n') i++
  if (text[i] !== open) return null
  let depth = 0
  for (let j = i; j < text.length; j++) {
    const char = text[j]
    if (char === '\\') {
      j++
      continue
    }
    if (char === open) depth++
    else if (char === close && --depth === 0) {
      return { from: i, to: j + 1 }
    }
  }
  return null
}

// What may come before a row's first cell without being part of it
const LEADING = [
  /^\\(hline|toprule|midrule|bottomrule|morecmidrules|endhead|endfirsthead|endfoot|endlastfoot|tabularnewline)(?![A-Za-z])/,
  /^\\(cline|hhline)\{[^}]*\}/,
  /^\\cmidrule(\[[^\]]*\])?(\([^)]*\))?\{[^}]*\}/,
  /^\\addlinespace(\[[^\]]*\])?/,
  /^\\rowcolor(\[[^\]]*\])?\{[^}]*\}/,
  /^%[^\n]*\n?/,
]

/** Where a row's real first cell starts, after rules and comments */
function skipLeading(text: string, at: number, end: number) {
  let i = at
  for (;;) {
    while (i < end && /\s/.test(text[i])) i++
    const rest = text.slice(i, end)
    const match = LEADING.map(re => rest.match(re)).find(Boolean)
    if (!match) return i
    i += match[0].length
  }
}

/** Split a table body into rows of cells (positions in `text`) */
function splitRows(text: string, from: number, to: number) {
  const rows: { cells: Span[] }[] = []
  let cells: Span[] = []
  let cellStart = from
  let depth = 0
  const endCell = (at: number) => {
    cells.push({ from: cellStart, to: at })
  }
  for (let i = from; i < to; i++) {
    const char = text[i]
    if (char === '%') {
      // a comment runs to the end of the line
      while (i < to && text[i] !== '\n') i++
      continue
    }
    if (char === '\\') {
      if (text[i + 1] === '\\' && depth === 0) {
        endCell(i)
        rows.push({ cells })
        cells = []
        // \\*, \\[2pt] stay with the row that ends here
        let j = i + 2
        if (text[j] === '*') j++
        const length = group(text, j, '[', ']')
        if (length && /^\s*$/.test(text.slice(j, length.from))) j = length.to
        i = j - 1
        cellStart = j
        continue
      }
      i++ // \&, \{, \% and any other escape
      continue
    }
    if (char === '{') depth++
    else if (char === '}') depth--
    else if (char === '&' && depth === 0) {
      endCell(i)
      cellStart = i + 1
    }
  }
  endCell(to)
  rows.push({ cells })
  return rows
}

/** The table environment around `pos`, parsed, or why not */
export function tableAt(
  state: EditorState,
  pos: number
): Table | { error: string } | null {
  for (
    let node: SyntaxNode | null = tree(state).resolveInner(pos, 1);
    node;
    node = node.parent
  ) {
    if (!node.type.is('$Environment')) continue
    const name = getEnvironmentName(node, state)
    if (!name || !TABLE_ENVIRONMENTS.has(name)) continue
    const begin = node.getChild('BeginEnv')
    const end = node.getChild('EndEnv')
    if (!begin || !end) return null
    const text = state.doc.toString()

    // \begin{name}[pos]{width}{spec}: the arguments are part of BeginEnv,
    // so read on from the end of {name}
    let at = begin.getChild('EnvNameGroup')?.to ?? begin.to
    const optional = group(text, at, '[', ']')
    if (optional && /^\s*$/.test(text.slice(at, optional.from)))
      at = optional.to
    if (WIDTH_FIRST.has(name)) {
      const width = group(text, at)
      if (!width) return { error: 'This table has no width argument.' }
      at = width.to
    }
    const spec = group(text, at)
    if (!spec) return { error: 'This table has no column spec.' }

    const bodyFrom = spec.to
    const rows: Row[] = []
    for (const raw of splitRows(text, bodyFrom, end.from)) {
      const cells = raw.cells.map((cell, i) => {
        const start =
          i === 0 ? skipLeading(text, cell.from, cell.to) : cell.from
        let a = start
        let b = cell.to
        while (a < b && /\s/.test(text[a])) a++
        while (b > a && /\s/.test(text[b - 1])) b--
        return { from: cell.from, to: cell.to, content: { from: a, to: b } }
      })
      // Not a data row: only rules, or one cell in a table of several
      // columns (a longtable caption, \endhead…)
      const hasText = cells.some(cell => cell.content.to > cell.content.from)
      if (!hasText || cells.length < 2) continue
      rows.push({ cells, line: state.doc.lineAt(cells[0].content.from).number })
    }
    return { name, spec: { from: spec.from + 1, to: spec.to - 1 }, rows }
  }
  return null
}

type SpecToken = { text: string; column: boolean }

/** Split a column spec into columns and what sits between them */
export function parseSpec(spec: string): SpecToken[] | { error: string } {
  const tokens: SpecToken[] = []
  let i = 0
  let prefix = ''
  const readGroups = (open = '{', close = '}') => {
    let out = ''
    for (;;) {
      const g = group(spec, i, open, close)
      if (!g || !/^\s*$/.test(spec.slice(i, g.from))) return out
      out += spec.slice(i, g.to)
      i = g.to
    }
  }
  while (i < spec.length) {
    const char = spec[i]
    if (/\s/.test(char)) {
      tokens.push({ text: char, column: false })
      i++
    } else if (char === '|' || char === ':') {
      tokens.push({ text: char, column: false })
      i++
    } else if (char === '@' || char === '!') {
      i++
      tokens.push({ text: char + readGroups(), column: false })
    } else if (char === '>') {
      i++
      prefix += '>' + readGroups()
    } else if (char === '<') {
      // belongs to the column before it
      i++
      const suffix = '<' + readGroups()
      const last = [...tokens].reverse().find(token => token.column)
      if (!last) return { error: 'The column spec starts with <{…}.' }
      last.text += suffix
    } else if (char === '*') {
      i++
      const count = group(spec, i)
      if (!count)
        return { error: 'The column spec has a *{…} without a count.' }
      const times = Number(spec.slice(count.from + 1, count.to - 1).trim())
      const body = group(spec, count.to)
      if (!body || !Number.isInteger(times) || times < 1 || times > 50) {
        return { error: 'The column spec has a *{n}{…} that can’t be read.' }
      }
      const inner = parseSpec(spec.slice(body.from + 1, body.to - 1))
      if ('error' in inner) return inner
      for (let n = 0; n < times; n++) {
        if (n) tokens.push({ text: ' ', column: false })
        tokens.push(...inner.map(token => ({ ...token })))
      }
      i = body.to
    } else if (/[A-Za-z]/.test(char)) {
      i++
      // p{3cm}, m{…}, S[table-format=2.1], w{c}{2cm}…
      let args = ''
      for (;;) {
        const before = i
        args += readGroups('[', ']') + readGroups()
        if (i === before) break
      }
      tokens.push({ text: prefix + char + args, column: true })
      prefix = ''
    } else {
      return { error: `The column spec has “${char}”, which this can’t read.` }
    }
  }
  if (prefix) return { error: 'The column spec ends with >{…}.' }
  return tokens
}

const columnsOf = (tokens: SpecToken[]) => tokens.filter(token => token.column)

/**
 * The edit that moves the column at the cursor one place left or right,
 * or a message saying why it can't
 */
export function moveColumn(
  state: EditorState,
  direction: -1 | 1
): TransactionSpec | { error: string } {
  const head = state.selection.main.head
  const table = tableAt(state, head)
  if (!table) return { error: 'Put the cursor in a table cell first.' }
  if ('error' in table) return table

  const row = table.rows.find(
    candidate =>
      head >= candidate.cells[0].from &&
      head <= candidate.cells[candidate.cells.length - 1].to
  )
  if (!row) return { error: 'Put the cursor in a table cell, not on a rule.' }
  const column = row.cells.findIndex(
    cell => head >= cell.from && head <= cell.to
  )
  const target = column + direction
  if (target < 0) return { error: 'This is already the first column.' }

  const specText = state.sliceDoc(table.spec.from, table.spec.to)
  const tokens = parseSpec(specText)
  if ('error' in tokens) return tokens
  const columns = columnsOf(tokens)
  if (target >= columns.length) {
    return { error: 'This is already the last column.' }
  }

  const low = Math.min(column, target)
  const high = Math.max(column, target)
  const text = (span: Span) => state.sliceDoc(span.from, span.to)
  for (const r of table.rows) {
    const touched = r.cells
      .slice(0, high + 1)
      .map(text)
      .join('&')
    if (/\\multicolumn(?![A-Za-z])/.test(touched)) {
      return {
        error: `A merged cell (\\multicolumn) on line ${r.line} spans these columns; moving columns past it isn’t supported yet.`,
      }
    }
    if (r.cells.length > low && r.cells.length <= high) {
      return {
        error: `The row on line ${r.line} has only ${r.cells.length} cells, so this column can’t move there.`,
      }
    }
  }

  // The spec: swap the two columns, keep what sits between them in place
  const order = tokens.map(token => token.text)
  const indexOf = (n: number) => {
    let seen = -1
    return tokens.findIndex(token => token.column && ++seen === n)
  }
  const a = indexOf(low)
  const b = indexOf(high)
  ;[order[a], order[b]] = [order[b], order[a]]
  const changes = [
    { from: table.spec.from, to: table.spec.to, insert: order.join('') },
  ]

  // Each row: swap the two cells' contents, keep their spacing
  for (const r of table.rows) {
    if (r.cells.length <= high) continue
    const left = r.cells[low].content
    const right = r.cells[high].content
    changes.push(
      { from: left.from, to: left.to, insert: text(right) },
      { from: right.from, to: right.to, insert: text(left) }
    )
  }

  // Keep the cursor in the text it was in, now one column over
  const moving = row.cells[column].content
  const offset = Math.max(
    0,
    Math.min(head - moving.from, moving.to - moving.from)
  )
  const destination = row.cells[target].content
  const start = state.changes(changes).mapPos(destination.from, -1)

  return {
    changes,
    selection: EditorSelection.cursor(start + offset),
    scrollIntoView: true,
    userEvent: 'input.sumitex-move-column',
  }
}
