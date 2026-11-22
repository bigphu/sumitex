import { expect } from 'chai'
import { mapDocument } from '../../../frontend/js/outline/document-map'
import { contentsEntries } from '../../../frontend/js/outline/contents-view'

const docs = new Map<string, string>([
  ['main.tex', String.raw`\section{Start}
\input{a}
\input{b}
\section{End}`],
  ['a.tex', String.raw`\section{A}
\subsection{A one}
\input{a-part}`],
  ['a-part.tex', String.raw`\subsection{A part}`],
  ['b.tex', String.raw`\section{B}`],
])

// What the editor's live outline gives for a.tex (with an edit not yet saved)
const live = [
  { line: 1, title: 'A', level: 4, children: [{ line: 2, title: 'A \\& one', level: 5 }] },
]

describe('outline contents entries', function () {
  it('puts the open file live, in place, with what it pulls in at its line', function () {
    const map = mapDocument(docs, 'main.tex', 'a.tex')
    const entries = contentsEntries(map, live, 'a.tex', true)
    expect(entries.map(e => [e.title, e.live, e.anchor])).to.deep.equal([
      ['Start', false, null],
      ['A', true, 1],
      ['A & one', true, 2],
      ['A part', false, 3],
      ['B', false, null],
      ['End', false, null],
    ])
  })

  it('uses the open file’s saved headings while the live outline catches up', function () {
    const map = mapDocument(docs, 'main.tex', 'a.tex')
    const entries = contentsEntries(map, null, 'a.tex', true)
    expect(entries.map(e => [e.title, e.live])).to.deep.equal([
      ['Start', false],
      ['A', true],
      ['A one', true],
      ['A part', false],
      ['B', false],
      ['End', false],
    ])
  })

  it('shows the whole document when the open file has no outline', function () {
    const map = mapDocument(docs, 'main.tex', null)
    const entries = contentsEntries(map, [], null, false)
    expect(entries.map(e => e.title)).to.deep.equal(['Start', 'A', 'A one', 'A part', 'B', 'End'])
  })

  it('shows only the open file when it is outside the document', function () {
    const map = mapDocument(docs, 'main.tex', 'loose.tex')
    const entries = contentsEntries(map, [{ line: 1, title: 'Loose', level: 4 }], 'loose.tex', true)
    expect(entries.map(e => e.title)).to.deep.equal(['Loose'])
  })
})
