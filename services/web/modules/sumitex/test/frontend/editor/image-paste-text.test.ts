import { expect } from 'chai'
import { EditorState } from '@codemirror/state'
import {
  figureBlock,
  figureLabel,
  labelsIn,
  placeFigures,
  safeStem,
  uniqueName,
  widthIn,
} from '../../../frontend/js/editor/image-paste-text'

/** The document after placing `blocks` at the marker | in `doc` */
const place = (doc: string, blocks: string[]) => {
  const pos = doc.indexOf('|')
  const text = doc.replace('|', '')
  const state = EditorState.create({ doc: text })
  const change = placeFigures(state, pos, blocks)
  const next = state.update({ changes: change }).state.doc.toString()
  return { next, startsWith: next.slice(change.start, change.start + 3) }
}

describe('SumiTeX image paste: names, labels and placement', function () {
  it('makes file names LaTeX takes without fuss', function () {
    expect(safeStem('Kết quả 2.PNG')).to.equal('ket-qua-2')
    expect(safeStem('Đồ thị (final).webp')).to.equal('do-thi-final')
    expect(safeStem('screenshot 2026-11-20 at 10.31.42.png')).to.equal(
      'screenshot-2026-11-20-at-10-31-42'
    )
    expect(safeStem('图.png')).to.equal('image')
  })

  it('never reuses a name in the folder', function () {
    const taken = new Set(['pasted-1.png', 'chart.png'])
    expect(uniqueName('pasted', 'png', taken, true)).to.equal('pasted-2.png')
    expect(uniqueName('chart', 'png', taken)).to.equal('chart-2.png')
    expect(uniqueName('plot', 'pdf', taken)).to.equal('plot.pdf')
    // Names compare without case, as on most computers
    expect(uniqueName('chart', 'png', new Set(['chart.png']))).to.equal(
      'chart-2.png'
    )
  })

  it('gives each figure a label of its own', function () {
    const taken = labelsIn('\\label{fig:chart} \\label {fig:chart-2} \\label{eq:x}')
    expect(figureLabel('chart', taken)).to.equal('fig:chart-3')
    expect(figureLabel('photo', taken)).to.equal('fig:photo')
  })

  it('puts a figure after the line with the cursor, a blank line either side', function () {
    const block = figureBlock('images/a.png', 'fig:a')
    const { next, startsWith } = place('One line.|\nNext line.\n', [block])
    expect(next).to.equal(`One line.\n\n${block}\n\nNext line.\n`)
    expect(startsWith).to.equal('\\be')
    // Mid-line: still after the line, never splitting it
    expect(place('One| line.\nNext.', [block]).next).to.equal(
      `One line.\n\n${block}\n\nNext.`
    )
  })

  it('uses an empty line, adding blank lines only where needed', function () {
    const block = figureBlock('images/a.png', 'fig:a')
    // Between two paragraphs
    expect(place('A.\n|\nB.', [block]).next).to.equal(`A.\n\n${block}\n\nB.`)
    // Already blank lines around
    expect(place('A.\n\n|\n\nB.', [block]).next).to.equal(
      `A.\n\n${block}\n\nB.`
    )
    // Before a blank line: no extra one
    expect(place('A.|\n\nB.', [block]).next).to.equal(`A.\n\n${block}\n\nB.`)
  })

  it('separates several figures with a blank line', function () {
    const a = figureBlock('images/a.png', 'fig:a')
    const b = figureBlock('images/b.png', 'fig:b')
    expect(place('Text.|', [a, b]).next).to.equal(`Text.\n\n${a}\n\n${b}`)
  })

  it('finds the width to change', function () {
    const block = figureBlock('images/a.png', 'fig:a')
    const width = widthIn(block)!
    expect(width.value).to.equal('0.8')
    expect(block.slice(width.from, width.to)).to.equal('width=0.8\\linewidth')
    expect(widthIn('\\includegraphics[width=\\linewidth]{x}')!.value).to.equal('1')
    expect(widthIn('\\includegraphics{x}')).to.equal(null)
  })
})
