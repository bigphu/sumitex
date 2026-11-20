import { expect } from 'chai'
import { EditorState } from '@codemirror/state'
import { LanguageSupport, ensureSyntaxTree } from '@codemirror/language'
import { LaTeXLanguage } from '@/features/source-editor/languages/latex/latex-language'
import {
  listItemsAt,
  moveListItem,
} from '../../../frontend/js/editor/list-items'

const makeState = (doc: string, at: string, offset = 0) => {
  const anchor = doc.indexOf(at) + offset
  if (anchor < offset) throw new Error(`${at} not in the document`)
  const state = EditorState.create({
    doc,
    selection: { anchor },
    extensions: [new LanguageSupport(LaTeXLanguage)],
  })
  ensureSyntaxTree(state, doc.length, 1000)
  return state
}

/** The document after moving the item at `at`, and the cursor's line */
const move = (doc: string, at: string, direction: -1 | 1) => {
  const state = makeState(doc, at)
  const spec = moveListItem(state, direction)
  if (spec === null || spec === 'edge') return spec
  const next = state.update(spec).state
  const head = next.selection.main.head
  return {
    doc: next.doc.toString(),
    line: next.doc.lineAt(head).text,
    head,
  }
}

const list = (...lines: string[]) => lines.join('\n') + '\n'

describe('SumiTeX list items: moving a whole \\item', function () {
  const doc = list(
    '\\begin{itemize}',
    '  \\item One',
    '  \\item Two',
    '  \\item Three',
    '\\end{itemize}'
  )

  it('moves an item up and keeps the cursor on it', function () {
    const result = move(doc, 'Two', -1)
    expect(result).to.deep.include({
      doc: list(
        '\\begin{itemize}',
        '  \\item Two',
        '  \\item One',
        '  \\item Three',
        '\\end{itemize}'
      ),
      line: '  \\item Two',
    })
  })

  it('moves an item down', function () {
    const result = move(doc, 'Two', 1)
    expect(result && result !== 'edge' && result.doc).to.equal(
      list(
        '\\begin{itemize}',
        '  \\item One',
        '  \\item Three',
        '  \\item Two',
        '\\end{itemize}'
      )
    )
  })

  it('does nothing past the first or last item', function () {
    expect(move(doc, 'One', -1)).to.equal('edge')
    expect(move(doc, 'Three', 1)).to.equal('edge')
  })

  it('moves wrapped lines and a sub-list with their item', function () {
    const nested = list(
      '\\begin{enumerate}',
      '  \\item First, which goes on',
      '    over a second line',
      '    \\begin{itemize}',
      '      \\item Sub A',
      '      \\item Sub B',
      '    \\end{itemize}',
      '  \\item Second',
      '\\end{enumerate}'
    )
    const result = move(nested, 'over a second', 1)
    expect(result && result !== 'edge' && result.doc).to.equal(
      list(
        '\\begin{enumerate}',
        '  \\item Second',
        '  \\item First, which goes on',
        '    over a second line',
        '    \\begin{itemize}',
        '      \\item Sub A',
        '      \\item Sub B',
        '    \\end{itemize}',
        '\\end{enumerate}'
      )
    )
  })

  it('moves only the inner item when the cursor is in a sub-list', function () {
    const nested = list(
      '\\begin{enumerate}',
      '  \\item First',
      '    \\begin{itemize}',
      '      \\item Sub A',
      '      \\item Sub B',
      '    \\end{itemize}',
      '  \\item Second',
      '\\end{enumerate}'
    )
    const result = move(nested, 'Sub B', -1)
    expect(result && result !== 'edge' && result.doc).to.equal(
      list(
        '\\begin{enumerate}',
        '  \\item First',
        '    \\begin{itemize}',
        '      \\item Sub B',
        '      \\item Sub A',
        '    \\end{itemize}',
        '  \\item Second',
        '\\end{enumerate}'
      )
    )
  })

  it('keeps \\item[label] with its item', function () {
    const description = list(
      '\\begin{description}',
      '  \\item[Alpha] first',
      '  \\item[Beta] second',
      '\\end{description}'
    )
    const result = move(description, 'second', -1)
    expect(result && result !== 'edge' && result.doc).to.equal(
      list(
        '\\begin{description}',
        '  \\item[Beta] second',
        '  \\item[Alpha] first',
        '\\end{description}'
      )
    )
  })

  it('ignores an \\item in a comment or in verbatim', function () {
    const hidden = list(
      '\\begin{itemize}',
      '  \\item One',
      '  % \\item not a real item',
      '  \\item Two',
      '  \\begin{verbatim}',
      '  \\item not one either',
      '  \\end{verbatim}',
      '\\end{itemize}'
    )
    const state = makeState(hidden, 'Two')
    const found = listItemsAt(state)
    expect(found?.items).to.have.length(2)
    const result = move(hidden, 'not a real', 1)
    expect(result && result !== 'edge' && result.doc).to.equal(
      list(
        '\\begin{itemize}',
        '  \\item Two',
        '  \\begin{verbatim}',
        '  \\item not one either',
        '  \\end{verbatim}',
        '  \\item One',
        '  % \\item not a real item',
        '\\end{itemize}'
      )
    )
  })

  it('leaves other lines to the plain line move', function () {
    const text = list(
      'Some text',
      '\\begin{itemize}',
      '  \\item One',
      '\\end{itemize}'
    )
    expect(move(text, 'Some text', 1)).to.equal(null)
    // On the \begin line, which is in no item
    expect(move(doc, 'begin{itemize}', 1)).to.equal(null)
  })

  it('falls back when items share a line', function () {
    const packed = list('\\begin{itemize} \\item a \\item b', '\\end{itemize}')
    expect(move(packed, 'b', -1)).to.equal(null)
  })

  it('makes one change, so one undo step', function () {
    const state = makeState(doc, 'Two')
    const spec = moveListItem(state, -1)
    expect(spec).to.be.an('object')
    if (spec && spec !== 'edge') {
      const transaction = state.update(spec)
      let changes = 0
      transaction.changes.iterChanges(() => changes++)
      expect(changes).to.equal(1)
    }
  })
})
