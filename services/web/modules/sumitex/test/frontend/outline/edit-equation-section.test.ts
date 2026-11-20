import { expect } from 'chai'
import { EditorState, TransactionSpec } from '@codemirror/state'
import { LanguageSupport, ensureSyntaxTree } from '@codemirror/language'
import { LaTeXLanguage } from '@/features/source-editor/languages/latex/latex-language'
import {
  readEquation,
  setKind,
  setLabel as setEquationLabel,
  setNumbered as setEquationNumbered,
  setSource,
} from '../../../frontend/js/outline/edit/equation-model'
import {
  readSection,
  setLabel as setSectionLabel,
  setLevel,
  setNumbered as setSectionNumbered,
  setTitle,
} from '../../../frontend/js/outline/edit/section-model'

const lines = (...rows: string[]) => rows.join('\n') + '\n'

const stateOf = (doc: string) => {
  const state = EditorState.create({
    doc,
    extensions: [new LanguageSupport(LaTeXLanguage)],
  })
  ensureSyntaxTree(state, doc.length, 1000)
  return state
}

const apply = (state: EditorState, edit: TransactionSpec | { error: string }) =>
  'error' in edit ? `error: ${edit.error}` : state.update(edit).state.doc.toString()

describe('SumiTeX edit pop-ups: the equation model', function () {
  const doc = lines(
    'See \\eqref{eq:erm}.',
    '\\begin{equation}',
    '  \\hat{\\theta} = \\arg\\min_{\\theta} L(\\theta)',
    '  \\label{eq:erm}',
    '\\end{equation}',
    '\\[ a^2 + b^2 = c^2 \\]'
  )
  const state = stateOf(doc)
  const equation = readEquation(state, doc.indexOf('\\hat'))!

  it('reads the source without its label, the label and its use', function () {
    expect(equation).to.include({ kind: 'equation', numbered: true, bracket: false, referenced: true })
    expect(equation.source.text).to.equal('\\hat{\\theta} = \\arg\\min_{\\theta} L(\\theta)')
    expect(equation.label?.text).to.equal('eq:erm')
  })

  it('edits the source, keeping the label and the layout', function () {
    expect(apply(state, setSource(equation, 'x = 1'))).to.include(
      '\\begin{equation}\n  x = 1\n  \\label{eq:erm}\n\\end{equation}'
    )
  })

  it('switches to align and to unnumbered', function () {
    const aligned = apply(state, setKind(equation, 'align'))
    expect(aligned).to.include('\\begin{align}').and.include('\\end{align}')
    expect(apply(state, setEquationNumbered(equation, false))).to.include(
      '\\begin{equation*}'
    )
  })

  it('reads \\[ \\] as an unnumbered equation, and numbers it for a label', function () {
    const bracket = readEquation(state, doc.indexOf('a^2'))!
    expect(bracket).to.include({ bracket: true, numbered: false })
    expect(bracket.source.text).to.equal('a^2 + b^2 = c^2')
    expect(apply(state, setEquationNumbered(bracket, true))).to.include(
      '\\begin{equation} a^2 + b^2 = c^2 \\end{equation}'
    )
    expect(apply(state, setEquationLabel(bracket, 'eq:pyth'))).to.include(
      '\\begin{equation}\\label{eq:pyth} a^2 + b^2 = c^2 \\end{equation}'
    )
  })
})

describe('SumiTeX edit pop-ups: the section model', function () {
  const doc = lines(
    '\\section{Data collection}',
    '\\label{sec:data}',
    'Text.',
    '\\subsection{Sources}',
    'More.',
    '\\section{Model}',
    'Rest.'
  )
  const state = stateOf(doc)
  const section = readSection(state, 0)!

  it('reads the title, level, label and the sections inside', function () {
    expect(section.title.text).to.equal('Data collection')
    expect(section.level).to.equal(2)
    expect(section.numbered).to.equal(true)
    expect(section.label?.text).to.equal('sec:data')
    expect(section.inner.map(inner => inner.level)).to.deep.equal([3])
  })

  it('edits the title and the numbering', function () {
    expect(apply(state, setTitle(section, 'Data'))).to.include('\\section{Data}\n')
    expect(apply(state, setSectionNumbered(section, false))).to.include(
      '\\section*{Data collection}'
    )
  })

  it('moves the sections inside along with a new level', function () {
    const deeper = apply(state, setLevel(section, 3))
    expect(deeper).to.include('\\subsection{Data collection}')
    expect(deeper).to.include('\\subsubsection{Sources}')
    // The next section is not inside: it stays
    expect(deeper).to.include('\\section{Model}')
  })

  it('adds a label on the line after the command', function () {
    const model = readSection(state, doc.indexOf('\\section{Model}'))!
    expect(model.label).to.equal(null)
    expect(apply(state, setSectionLabel(model, 'sec:model'))).to.include(
      '\\section{Model}\n\\label{sec:model}\nRest.'
    )
  })

  it('finds nothing on a line without a section command', function () {
    expect(readSection(state, doc.indexOf('Text.'))).to.equal(null)
  })
})
