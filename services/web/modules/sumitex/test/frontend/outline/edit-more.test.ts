import { expect } from 'chai'
import { EditorState, TransactionSpec } from '@codemirror/state'
import { LanguageSupport, ensureSyntaxTree } from '@codemirror/language'
import { LaTeXLanguage } from '@/features/source-editor/languages/latex/latex-language'
import {
  readFigure,
  setCaption as setFigureCaption,
  setCentering,
  setImage,
  setLabel as setFigureLabel,
  setPlacement,
  setWidth,
  widthFraction,
} from '../../../frontend/js/outline/edit/figure-model'
import {
  missingDefinition,
  readTheorem,
  setLabel as setTheoremLabel,
  setTitle,
  setType,
} from '../../../frontend/js/outline/edit/theorem-model'
import {
  readNote,
  removeTodo,
  setBoxTitle,
  setNoteText,
} from '../../../frontend/js/outline/edit/note-model'
import {
  readCode,
  setCaption as setCodeCaption,
  setLanguage,
  setNumbered,
} from '../../../frontend/js/outline/edit/code-model'

const lines = (...rows: string[]) => rows.join('\n') + '\n'

const stateOf = (doc: string) => {
  const state = EditorState.create({ doc, extensions: [new LanguageSupport(LaTeXLanguage)] })
  ensureSyntaxTree(state, doc.length, 1000)
  return state
}

const apply = (state: EditorState, edit: TransactionSpec | { error: string }) =>
  'error' in edit ? `error: ${edit.error}` : state.update(edit).state.doc.toString()

describe('SumiTeX edit pop-ups: the figure model', function () {
  const doc = lines(
    '\\begin{figure}[t]',
    '  \\centering',
    '  \\includegraphics[width=0.8\\linewidth]{figures/pipeline}',
    '  \\caption{Overview of the data pipeline.}',
    '  \\label{fig:pipeline}',
    '\\end{figure}'
  )
  const state = stateOf(doc)
  const figure = readFigure(state, doc.indexOf('pipeline'))!

  it('reads the image, its width, caption, label and placement', function () {
    expect(figure.name).to.equal('figure')
    expect(figure.images).to.have.length(1)
    expect(figure.images[0].path.text).to.equal('figures/pipeline')
    expect(widthFraction(figure.images[0].width)).to.equal('0.8')
    expect(figure.caption?.text).to.equal('Overview of the data pipeline.')
    expect(figure.label?.text).to.equal('fig:pipeline')
    expect(Boolean(figure.centering)).to.equal(true)
  })

  it('changes the width, the image (in the old path style) and the placement', function () {
    expect(apply(state, setWidth(state, figure, 0, '0.5\\linewidth'))).to.include(
      '\\includegraphics[width=0.5\\linewidth]{figures/pipeline}'
    )
    expect(apply(state, setImage(figure, 0, 'images/pasted-1.png'))).to.include(
      '{images/pasted-1}'
    )
    expect(apply(state, setPlacement(figure, 'htbp'))).to.include('\\begin{figure}[htbp]')
    expect(apply(state, setCentering(state, figure, false))).not.to.include('\\centering')
  })

  it('leaves a \\label inside the caption out of the caption box', function () {
    const doc = lines('\\begin{figure}', '\\includegraphics{frog.jpg}', '\\caption{\\label{fig:frog}This frog.}', '\\end{figure}')
    const state = stateOf(doc)
    const model = readFigure(state, 0)!
    expect(model.caption?.text).to.equal('This frog.')
    expect(model.label?.text).to.equal('fig:frog')
    expect(apply(state, setFigureCaption(state, model, 'A frog.'))).to.include('\\caption{\\label{fig:frog}A frog.}')
  })

  it('adds a width to an image without options', function () {
    const bare = stateOf(lines('\\begin{figure}', '\\includegraphics{a.png}', '\\end{figure}'))
    const model = readFigure(bare, 0)!
    expect(apply(bare, setWidth(bare, model, 0, '\\linewidth'))).to.include(
      '\\includegraphics[width=\\linewidth]{a.png}'
    )
    expect(apply(bare, setFigureCaption(bare, model, 'An A'))).to.include(
      '\\includegraphics{a.png}\n  \\caption{An A}\n\\end{figure}'
    )
  })

  it('wraps a bare drawing in a figure for its caption', function () {
    const tikz = stateOf(lines('\\begin{tikzpicture}', '\\draw (0,0) -- (1,1);', '\\end{tikzpicture}'))
    const model = readFigure(tikz, 5)!
    expect(model).to.include({ name: null, drawing: 'tikzpicture' })
    expect(apply(tikz, setFigureLabel(tikz, model, 'fig:line'))).to.equal(
      lines(
        '\\begin{figure}[htbp]',
        '  \\centering',
        '\\begin{tikzpicture}',
        '\\draw (0,0) -- (1,1);',
        '\\end{tikzpicture}',
        '  \\label{fig:line}',
        '\\end{figure}'
      )
    )
  })
})

describe('SumiTeX edit pop-ups: the theorem model', function () {
  const doc = lines('\\begin{lemma}[Consistency]\\label{lem:c}', '  The estimator converges.', '\\end{lemma}')
  const state = stateOf(doc)
  const model = readTheorem(state, doc.indexOf('converges'))!

  it('reads the type, name, label and body', function () {
    expect(model.type).to.equal('lemma')
    expect(model.title?.text).to.equal('Consistency')
    expect(model.label?.text).to.equal('lem:c')
    expect(model.body.text).to.equal('The estimator converges.')
  })

  it('switches the type and edits or removes the name', function () {
    const changed = apply(state, setType(model, 'theorem'))
    expect(changed).to.include('\\begin{theorem}[Consistency]').and.include('\\end{theorem}')
    expect(apply(state, setTitle(model, ''))).to.include('\\begin{lemma}\\label{lem:c}')
    expect(apply(state, setTitle(model, 'Rate'))).to.include('\\begin{lemma}[Rate]')
  })

  it('adds a label after the name, and says what the preamble lacks', function () {
    const plain = stateOf(lines('\\begin{theorem}[A]', 'x', '\\end{theorem}'))
    const m = readTheorem(plain, 3)!
    expect(apply(plain, setTheoremLabel(m, 'thm:a'))).to.include('\\begin{theorem}[A]\\label{thm:a}')
    expect(missingDefinition('lemma', new Set(['env:theorem']))).to.equal('\\newtheorem{lemma}{Lemma}')
    expect(missingDefinition('theorem', new Set(['env:theorem']))).to.equal(null)
    expect(missingDefinition('proof', new Set())).to.equal(null)
  })
})

describe('SumiTeX edit pop-ups: the note model', function () {
  it('edits a \\todo and removes it when done', function () {
    const doc = lines('Text \\todo{check the numbers} here.', '\\todo{a line of its own}', 'End.')
    const state = stateOf(doc)
    const inline = readNote(state, doc.indexOf('check'))!
    expect(inline.kind).to.equal('todo')
    expect(apply(state, setNoteText(inline, 'recheck'))).to.include('\\todo{recheck}')
    expect(apply(state, removeTodo(state, inline))).to.include('Text here.')
    const own = readNote(state, doc.indexOf('a line'))!
    expect(apply(state, removeTodo(state, own))).to.equal(lines('Text \\todo{check the numbers} here.', 'End.'))
  })

  it('sets a tcolorbox title', function () {
    const doc = lines('\\begin{tcolorbox}', 'Remember this.', '\\end{tcolorbox}')
    const state = stateOf(doc)
    const box = readNote(state, doc.indexOf('Remember'))!
    expect(box.kind).to.equal('box')
    expect(apply(state, setBoxTitle(state, box, 'Note, please'))).to.include(
      '\\begin{tcolorbox}[title={Note, please}]'
    )
  })
})

describe('SumiTeX edit pop-ups: the code model', function () {
  it('reads and sets lstlisting options', function () {
    const doc = lines('\\begin{lstlisting}[language=Python]', 'print(1)', '\\end{lstlisting}')
    const state = stateOf(doc)
    const code = readCode(state, doc.indexOf('print'))!
    expect(code).to.include({ name: 'lstlisting', language: 'Python', numbered: false })
    expect(code.code?.text).to.equal('print(1)')
    expect(apply(state, setLanguage(state, code, 'C'))).to.include('[language=C]')
    expect(apply(state, setNumbered(state, code, true))).to.include('[language=Python, numbers=left]')
    expect(apply(state, setCodeCaption(state, code, 'Fib, fast'))).to.include(
      '[language=Python, caption={Fib, fast}]'
    )
    // Typing on into a caption that already exists: braces when a comma comes
    const typed = stateOf(lines('\\begin{lstlisting}[caption=Fib]', 'x', '\\end{lstlisting}'))
    const m = readCode(typed, 25)!
    expect(apply(typed, setCodeCaption(typed, m, 'Fib, fast'))).to.include('[caption={Fib, fast}]')
  })

  it('reads minted’s language and an algorithm’s caption', function () {
    const doc = lines(
      '\\begin{minted}{python}',
      'x = 1',
      '\\end{minted}',
      '\\begin{algorithm}',
      '\\caption{Training}',
      '\\begin{algorithmic}',
      '\\State go',
      '\\end{algorithmic}',
      '\\end{algorithm}'
    )
    const state = stateOf(doc)
    const minted = readCode(state, doc.indexOf('x = 1'))!
    expect(minted).to.include({ name: 'minted', language: 'python' })
    expect(apply(state, setNumbered(state, minted, true))).to.include('\\begin{minted}[linenos]{python}')
    const algorithm = readCode(state, doc.indexOf('Training'))!
    expect(algorithm.name).to.equal('algorithm')
    expect(algorithm.caption?.text).to.equal('Training')
  })
})
