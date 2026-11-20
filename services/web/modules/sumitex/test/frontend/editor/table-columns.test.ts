import { expect } from 'chai'
import { EditorState } from '@codemirror/state'
import { LanguageSupport, ensureSyntaxTree } from '@codemirror/language'
import { LaTeXLanguage } from '@/features/source-editor/languages/latex/latex-language'
import {
  moveColumn,
  parseSpec,
  tableAt,
} from '../../../frontend/js/editor/table-columns'

const makeState = (doc: string, at: string) => {
  const anchor = doc.indexOf(at)
  if (anchor < 0) throw new Error(`${at} not in the document`)
  const state = EditorState.create({
    doc,
    selection: { anchor },
    extensions: [new LanguageSupport(LaTeXLanguage)],
  })
  ensureSyntaxTree(state, doc.length, 1000)
  return state
}

/** The document after moving the column at `at`, or the error message */
const move = (doc: string, at: string, direction: -1 | 1) => {
  const state = makeState(doc, at)
  const result = moveColumn(state, direction)
  if ('error' in result) return { error: result.error as string }
  const next = state.update(result).state
  const head = next.selection.main.head
  return {
    doc: next.doc.toString(),
    // the word at the cursor, to see the cursor followed its cell
    at: next.sliceDoc(head, head + at.length),
  }
}

const lines = (...rows: string[]) => rows.join('\n') + '\n'

describe('SumiTeX table columns: moving a column', function () {
  const table = lines(
    '\\begin{tabular}{l c r}',
    '  \\hline',
    '  Name & Age & City \\\\',
    '  \\hline',
    '  Ann & 31 & Hue \\\\[2pt]',
    '  Bob & 27 & Hanoi \\\\',
    '  \\hline',
    '\\end{tabular}'
  )

  it('moves a column right, spec and every row, rules in place', function () {
    const result = move(table, 'Age', 1)
    expect(result).to.deep.equal({
      doc: lines(
        '\\begin{tabular}{l r c}',
        '  \\hline',
        '  Name & City & Age \\\\',
        '  \\hline',
        '  Ann & Hue & 31 \\\\[2pt]',
        '  Bob & Hanoi & 27 \\\\',
        '  \\hline',
        '\\end{tabular}'
      ),
      at: 'Age',
    })
  })

  it('moves the first column right from a cell in a later row', function () {
    const result = move(table, 'Bob', 1)
    expect(result).to.have.property('doc').that.includes('{c l r}')
    expect(result).to.have.property('doc').that.includes('27 & Bob & Hanoi')
    expect(result).to.have.property('at', 'Bob')
  })

  it('says why at either edge', function () {
    expect(move(table, 'Name', -1)).to.deep.equal({
      error: 'This is already the first column.',
    })
    expect(move(table, 'City', 1)).to.deep.equal({
      error: 'This is already the last column.',
    })
  })

  it('treats \\& and braces as text, not as cell breaks', function () {
    const doc = lines(
      '\\begin{tabular}{ll}',
      '  R\\&D & {a & b} \\\\',
      '\\end{tabular}'
    )
    const result = move(doc, 'R\\&D', 1)
    expect(result).to.have.property('doc').that.includes('{a & b} & R\\&D')
  })

  it('keeps vertical rules and >{…} with the right places', function () {
    const doc = lines(
      '\\begin{tabular}{|l|>{\\bfseries}c|p{2cm}|}',
      '  A1 & B1 & C1 \\\\',
      '\\end{tabular}'
    )
    const result = move(doc, 'B1', 1)
    expect(result)
      .to.have.property('doc')
      .that.includes('{|l|p{2cm}|>{\\bfseries}c|}')
    expect(result).to.have.property('doc').that.includes('A1 & C1 & B1')
  })

  it('spells out *{n}{…} so one column can move', function () {
    expect(parseSpec('*{3}{l}')).to.deep.equal([
      { text: 'l', column: true },
      { text: ' ', column: false },
      { text: 'l', column: true },
      { text: ' ', column: false },
      { text: 'l', column: true },
    ])
    const doc = lines(
      '\\begin{tabular}{*{3}{l}}',
      '  A1 & B1 & C1 \\\\',
      '\\end{tabular}'
    )
    const result = move(doc, 'A1', 1)
    expect(result).to.have.property('doc').that.includes('{l l l}')
    expect(result).to.have.property('doc').that.includes('B1 & A1 & C1')
  })

  it('refuses a merged cell, and says where it is', function () {
    const doc = lines(
      '\\begin{tabular}{lll}',
      '  \\multicolumn{2}{c}{Both} & x \\\\',
      '  A1 & B1 & C1 \\\\',
      '\\end{tabular}'
    )
    const result = move(doc, 'A1', 1)
    expect(result).to.have.property('error').that.includes('line 2')
    expect(result).to.have.property('error').that.includes('\\multicolumn')
  })

  it('works in tabularx (width first) with booktabs rules', function () {
    const doc = lines(
      '\\begin{tabularx}{\\linewidth}{lX}',
      '  \\toprule',
      '  Key & Meaning \\\\',
      '  \\midrule',
      '  x & the first \\\\',
      '  \\bottomrule',
      '\\end{tabularx}'
    )
    const result = move(doc, 'Meaning', -1)
    expect(result).to.have.property('doc').that.includes('{Xl}')
    expect(result).to.have.property('doc').that.includes('Meaning & Key')
    expect(result).to.have.property('doc').that.includes('the first & x')
    expect(result).to.have.property('doc').that.includes('\\toprule')
  })

  it('leaves a longtable caption row alone', function () {
    const doc = lines(
      '\\begin{longtable}{ll}',
      '  \\caption{Long}\\label{tab:long} \\\\',
      '  \\toprule',
      '  A & B \\\\',
      '  \\midrule',
      '  \\endhead',
      '  a & b \\\\',
      '\\end{longtable}'
    )
    const state = makeState(doc, 'a & b')
    const found = tableAt(state, state.selection.main.head)
    expect(found && !('error' in found) && found.rows).to.have.length(2)
    const result = move(doc, 'a & b', 1)
    expect(result)
      .to.have.property('doc')
      .that.includes('\\caption{Long}\\label{tab:long} \\\\')
    expect(result).to.have.property('doc').that.includes('B & A')
    expect(result).to.have.property('doc').that.includes('b & a')
  })

  it('asks for the cursor to be in a table', function () {
    expect(move(lines('Plain text', table), 'Plain', 1)).to.deep.equal({
      error: 'Put the cursor in a table cell first.',
    })
  })

  it('is one change set, so one undo step', function () {
    const state = makeState(table, 'Age')
    const result = moveColumn(state, 1)
    expect('error' in result).to.equal(false)
    if (!('error' in result)) {
      const transaction = state.update(result)
      expect(transaction.docChanged).to.equal(true)
    }
  })
})
