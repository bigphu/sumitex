import { expect } from 'chai'
import { EditorState, TransactionSpec } from '@codemirror/state'
import { LanguageSupport, ensureSyntaxTree } from '@codemirror/language'
import { LaTeXLanguage } from '@/features/source-editor/languages/latex/latex-language'
import {
  deleteBlock,
  duplicateBlock,
  referenceText,
  swapSections,
} from '../../../frontend/js/outline/edit/actions-model'
import { readSection } from '../../../frontend/js/outline/edit/section-model'

const lines = (...rows: string[]) => rows.join('\n') + '\n'
const stateOf = (doc: string) => {
  const state = EditorState.create({ doc, extensions: [new LanguageSupport(LaTeXLanguage)] })
  ensureSyntaxTree(state, doc.length, 1000)
  return state
}
const apply = (state: EditorState, edit: TransactionSpec | { error: string }) =>
  'error' in edit ? `error: ${edit.error}` : state.update(edit).state.doc.toString()

describe('SumiTeX outline: the ⋯ actions', function () {
  it('writes a reference the way the document can read it', function () {
    expect(referenceText('figure', 'fig:a', new Set())).to.equal('Figure~\\ref{fig:a}')
    expect(referenceText('figure', 'fig:a', new Set(['cleveref']))).to.equal('\\cref{fig:a}')
    expect(referenceText('equation', 'eq:e', new Set(['amsmath']))).to.equal('\\eqref{eq:e}')
    expect(referenceText('equation', 'eq:e', new Set())).to.equal('(\\ref{eq:e})')
    expect(referenceText('lemma', 'lem:a', new Set())).to.equal('Lemma~\\ref{lem:a}')
  })

  const doc = lines(
    'Before.',
    '',
    '\\begin{figure}',
    '  \\includegraphics{a}',
    '  \\label{fig:a}',
    '\\end{figure}',
    '',
    'After.'
  )
  const state = stateOf(doc)
  const range = { from: doc.indexOf('\\begin{figure}'), to: doc.indexOf('\\end{figure}') + 12 }

  it('duplicates a block after itself, with a label of its own', function () {
    const copied = apply(state, duplicateBlock(state, range))
    expect(copied).to.include('\\label{fig:a}\n\\end{figure}\n\n\\begin{figure}')
    expect(copied).to.include('\\label{fig:a-2}')
  })

  it('deletes a block and one blank line next to it', function () {
    expect(apply(state, deleteBlock(state, range))).to.equal(lines('Before.', '', 'After.'))
  })

  it('swaps a section with its neighbour, what each holds going along', function () {
    const sections = lines(
      '\\section{One}',
      'Text one.',
      '\\subsection{Inside one}',
      '\\section{Two}',
      'Text two.'
    )
    const s = stateOf(sections)
    const two = readSection(s, sections.indexOf('\\section{Two}'))!
    expect(two.previous).to.not.equal(null)
    expect(two.next).to.equal(null)
    expect(apply(s, swapSections(s, two.previous!, two.range))).to.equal(
      lines('\\section{Two}', 'Text two.', '\\section{One}', 'Text one.', '\\subsection{Inside one}')
    )
    const inside = readSection(s, sections.indexOf('\\subsection'))!
    expect(inside.previous).to.equal(null)
  })
})
