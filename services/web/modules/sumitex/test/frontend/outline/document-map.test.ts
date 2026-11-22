import { expect } from 'chai'
import { mapDocument, scanFile } from '../../../frontend/js/outline/document-map'

const docs = new Map<string, string>([
  [
    'main.tex',
    String.raw`\documentclass{article}
\begin{document}
\section{Overview} % the start
\input{sections/introduction}
\include{sections/method}
% \input{sections/old}
\section*{Thanks}
\appendix
\input{appendix.tex}
\end{document}`,
  ],
  ['sections/introduction.tex', String.raw`\section{Introduction}\label{sec:intro}
\subsection[Short]{What we wanted \emph{to} learn}
\input{sections/detail}`],
  ['sections/detail.tex', String.raw`\subsubsection{A detail}`],
  ['sections/method.tex', String.raw`\section{Method}
\subsection{Measuring}`],
  ['sections/old.tex', String.raw`\section{Old}`],
  ['appendix.tex', String.raw`\section{Appendix}`],
  ['other.tex', String.raw`\section{Standalone}`],
])

const titles = (list: { title: string }[]) => list.map(h => h.title)

describe('outline document map', function () {
  it('reads headings and includes in order, skipping comments', function () {
    const steps = scanFile(docs.get('main.tex')!, 'main.tex', '')
    expect(steps.map(s => s.kind)).to.deep.equal([
      'heading',
      'include',
      'include',
      'heading',
      'include',
    ])
  })

  it('keeps titles with braces and short titles out', function () {
    const steps = scanFile(docs.get('sections/introduction.tex')!, 'sections/introduction.tex', '')
    expect(steps[1]).to.include({ kind: 'heading', title: String.raw`What we wanted \emph{to} learn`, level: 5 })
  })

  it('splits the document around the open file', function () {
    const map = mapDocument(docs, 'main.tex', 'sections/method.tex')
    expect(map.inDocument).to.equal(true)
    expect(titles(map.before)).to.deep.equal([
      'Overview',
      'Introduction',
      String.raw`What we wanted \emph{to} learn`,
      'A detail',
    ])
    expect(titles(map.after)).to.deep.equal(['Thanks', 'Appendix'])
    expect(map.before[1]).to.include({ path: 'sections/introduction.tex', line: 1, level: 4 })
  })

  it('places the open file’s own includes by line', function () {
    const map = mapDocument(docs, 'main.tex', 'sections/introduction.tex')
    expect(map.includesInCurrent.map(i => [i.line, titles(i.headings)])).to.deep.equal([
      [3, ['A detail']],
    ])
    expect(titles(map.before)).to.deep.equal(['Overview'])
    expect(titles(map.after)).to.deep.equal(['Method', 'Measuring', 'Thanks', 'Appendix'])
  })

  it('treats the main file as the live part with every include inside', function () {
    const map = mapDocument(docs, 'main.tex', 'main.tex')
    expect(map.inDocument).to.equal(true)
    expect(map.before).to.have.length(0)
    expect(map.after).to.have.length(0)
    expect(map.includesInCurrent.map(i => i.line)).to.deep.equal([4, 5, 9])
  })

  it('leaves a file outside the document to itself, with the whole document aside', function () {
    const map = mapDocument(docs, 'main.tex', 'other.tex')
    expect(map.inDocument).to.equal(false)
    expect(titles(map.before)).to.include('Method')
  })

  it('does not loop on files that include each other', function () {
    const loop = new Map([
      ['main.tex', String.raw`\section{A}\input{b}`],
      ['b.tex', String.raw`\section{B}\input{main}`],
    ])
    const map = mapDocument(loop, 'main.tex', 'x.tex')
    expect(titles(map.before)).to.deep.equal(['A', 'B'])
  })

  it('resolves \\import and \\subimport', function () {
    const set = new Map([
      ['main.tex', String.raw`\import{parts/}{one}`],
      ['parts/one.tex', String.raw`\section{One}\subimport{sub/}{two}`],
      ['parts/sub/two.tex', String.raw`\section{Two}`],
    ])
    expect(titles(mapDocument(set, 'main.tex', null).before)).to.deep.equal(['One', 'Two'])
  })
})
