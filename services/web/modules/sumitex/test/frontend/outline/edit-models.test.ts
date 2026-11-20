import { expect } from 'chai'
import { EditorState, TransactionSpec } from '@codemirror/state'
import { LanguageSupport, ensureSyntaxTree } from '@codemirror/language'
import { LaTeXLanguage } from '@/features/source-editor/languages/latex/latex-language'
import {
  addColumn,
  addRow,
  deleteColumn,
  deleteRow,
  moveRow,
  readTable,
  setAlignment,
  setCaption,
  setCell,
  setLabel,
  toBooktabs,
} from '../../../frontend/js/outline/edit/table-model'
import {
  addItem,
  deleteItem,
  moveItem,
  readList,
  setItemText,
  setListType,
} from '../../../frontend/js/outline/edit/list-model'

const lines = (...rows: string[]) => rows.join('\n') + '\n'

const stateOf = (doc: string) => {
  const state = EditorState.create({
    doc,
    extensions: [new LanguageSupport(LaTeXLanguage)],
  })
  ensureSyntaxTree(state, doc.length, 1000)
  return state
}

/** The document after an edit, or its error */
const apply = (state: EditorState, edit: TransactionSpec | { error: string }) =>
  'error' in edit ? `error: ${edit.error}` : state.update(edit).state.doc.toString()

describe('SumiTeX edit pop-ups: the table model', function () {
  const table = lines(
    '\\begin{table}[htbp]',
    '  \\centering',
    '  \\begin{tabular}{|l|c|r|}',
    '    \\hline',
    '    Model & Accuracy & Params \\\\',
    '    \\hline',
    '    MLP & 0.912 & 0.4M \\\\',
    '    CNN & 0.937 & 1.2M \\\\',
    '    \\hline',
    '  \\end{tabular}',
    '\\end{table}'
  )
  const state = stateOf(table)
  const model = readTable(state, 0)!

  it('reads the cells, the columns and the missing caption and label', function () {
    expect(model.columns).to.equal(3)
    expect(model.rows.map(row => row.cells)).to.deep.equal([
      ['Model', 'Accuracy', 'Params'],
      ['MLP', '0.912', '0.4M'],
      ['CNN', '0.937', '1.2M'],
    ])
    expect(model.rows.every(row => row.single)).to.equal(true)
    expect(model.caption).to.equal(null)
    expect(model.label).to.equal(null)
    expect(model.hlines).to.have.length(3)
  })

  it('edits a cell in place', function () {
    expect(apply(state, setCell(model, 1, 1, '0.920'))).to.include(
      '    MLP & 0.920 & 0.4M \\\\'
    )
  })

  it('adds a row after the last one, and a column at the end', function () {
    expect(apply(state, addRow(state, model))).to.include(
      '    CNN & 0.937 & 1.2M \\\\\n    & & \\\\\n    \\hline'
    )
    const wider = apply(state, addColumn(state, model))
    expect(wider).to.include('\\begin{tabular}{|l|c|r|l|}')
    expect(wider).to.include('    MLP & 0.912 & 0.4M & \\\\')
  })

  it('moves and deletes whole rows, leaving the rules where they are', function () {
    const moved = apply(state, moveRow(state, model, 2, 1))
    expect(moved).to.include(
      '    \\hline\n    CNN & 0.937 & 1.2M \\\\\n    MLP & 0.912 & 0.4M \\\\\n    \\hline'
    )
    expect(apply(state, deleteRow(state, model, 1))).not.to.include('MLP')
  })

  it('deletes a column with its rule, and sets an alignment', function () {
    const narrower = apply(state, deleteColumn(model, 1))
    expect(narrower).to.include('\\begin{tabular}{|l|r|}')
    expect(narrower).to.include('    MLP & 0.4M \\\\')
    expect(apply(state, deleteColumn(model, 0))).to.include('    0.912 & 0.4M \\\\')
    expect(apply(state, setAlignment(model, 2, 'c'))).to.include('{|l|c|c|}')
  })

  it('adds a caption above the tabular, then a label after it', function () {
    const captioned = apply(state, setCaption(state, model, 'Results'))
    expect(captioned).to.include('  \\centering\n  \\caption{Results}\n  \\begin{tabular}')
    const next = stateOf(captioned)
    const labelled = apply(next, setLabel(next, readTable(next, 0)!, 'tab:results'))
    expect(labelled).to.include('\\caption{Results}\\label{tab:results}')
    const again = stateOf(labelled)
    const found = readTable(again, 0)!
    expect(found.caption?.text).to.equal('Results')
    expect(found.label?.text).to.equal('tab:results')
    expect(apply(again, setLabel(again, found, 'tab: final one'))).to.include(
      '\\label{tab:-final-one}'
    )
  })

  it('wraps a bare tabular in a table float for its caption', function () {
    const bare = stateOf(lines('\\begin{tabular}{ll}', 'a & b \\\\', '\\end{tabular}'))
    expect(apply(bare, setCaption(bare, readTable(bare, 0)!, 'Pairs'))).to.equal(
      lines(
        '\\begin{table}[htbp]',
        '  \\centering',
        '  \\caption{Pairs}',
        '\\begin{tabular}{ll}',
        'a & b \\\\',
        '\\end{tabular}',
        '\\end{table}'
      )
    )
  })

  it('turns \\hline rules into booktabs rules, without vertical rules', function () {
    const clean = apply(state, toBooktabs(model))
    expect(clean).to.include('\\begin{tabular}{lcr}')
    expect(clean.match(/\\(toprule|midrule|bottomrule)/g)).to.deep.equal([
      '\\toprule',
      '\\midrule',
      '\\bottomrule',
    ])
  })
})

describe('SumiTeX edit pop-ups: the list model', function () {
  const doc = lines(
    '\\begin{itemize}',
    '  \\item two hidden layers of width 256,',
    '  \\item dropout of 0.1 after each layer,',
    '    with a second line',
    '  \\item[Note] early stopping on the validation loss.',
    '\\end{itemize}'
  )
  const state = stateOf(doc)
  const model = readList(state, doc.indexOf('dropout'))!

  it('reads the type and the items, one-line ones editable', function () {
    expect(model.type).to.equal('itemize')
    expect(model.items.map(item => [item.text, item.editable])).to.deep.equal([
      ['two hidden layers of width 256,', true],
      ['dropout of 0.1 after each layer,', false],
      ['early stopping on the validation loss.', true],
    ])
  })

  it('edits an item, keeping its [label]', function () {
    expect(apply(state, setItemText(model, 2, 'patience 5'))).to.include(
      '  \\item[Note] patience 5\n'
    )
    expect(apply(state, setItemText(model, 1, 'x'))).to.match(/^error/)
  })

  it('types into a new, empty item', function () {
    const added = stateOf(apply(state, addItem(state, model)))
    const next = readList(added, 0)!
    const last = next.items.length - 1
    expect(next.items[last]).to.include({ text: '', editable: true })
    expect(apply(added, setItemText(next, last, 'patience 5'))).to.include(
      '  \\item patience 5\n\\end{itemize}'
    )
  })

  it('adds, deletes and moves items, and switches the type', function () {
    expect(apply(state, addItem(state, model))).to.include(
      'validation loss.\n  \\item \n\\end{itemize}'
    )
    expect(apply(state, deleteItem(model, 1))).not.to.include('dropout')
    expect(apply(state, moveItem(state, model, 0, 2))).to.include(
      'validation loss.\n  \\item two hidden'
    )
    const numbered = apply(state, setListType(model, 'enumerate'))
    expect(numbered.startsWith('\\begin{enumerate}')).to.equal(true)
    expect(numbered.trim().endsWith('\\end{enumerate}')).to.equal(true)
  })
})
