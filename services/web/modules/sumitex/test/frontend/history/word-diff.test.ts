import { expect } from 'chai'
import { wordDiff } from '../../../frontend/js/history/word-diff'
import type { DocDiffChunk } from '@/features/history/services/types/doc'

const meta = { users: [], start_ts: 0, end_ts: 0 } as unknown as DocDiffChunk['meta']
const u = (text: string): DocDiffChunk => ({ u: text })
const i = (text: string): DocDiffChunk => ({ i: text, meta })
const d = (text: string): DocDiffChunk => ({ d: text, meta })
const shape = (chunks: DocDiffChunk[]) =>
  chunks.map(c => ('u' in c ? `=${c.u}` : 'i' in c ? `+${c.i}` : `-${c.d}`))

describe('history wordDiff', function () {
  it('widens a change inside a word to the whole word', function () {
    const out = wordDiff([u('We '), i('roast'), d('brew'), u('ed the beans')])
    expect(shape(out)).to.deep.equal(['=We ', '-brewed', '+roasted', '= the beans'])
  })

  it('shows an insertion inside a word as the word before and after', function () {
    const out = wordDiff([u('the colo'), i('u'), u('r red')])
    expect(shape(out)).to.deep.equal(['=the ', '-color', '+colour', '= red'])
  })

  it('shows a deletion inside a word the same way', function () {
    const out = wordDiff([u('a colo'), d('u'), u('r')])
    expect(shape(out)).to.deep.equal(['=a ', '-colour', '+color'])
  })

  it('leaves whole-word changes alone', function () {
    const out = wordDiff([u('one '), d('two'), i('three'), u(' four')])
    expect(shape(out)).to.deep.equal(['=one ', '-two', '+three', '= four'])
  })

  it('keeps a pure insertion of whole words as an insertion', function () {
    const out = wordDiff([u('a '), i('big '), u('cat')])
    expect(shape(out)).to.deep.equal(['=a ', '+big ', '=cat'])
  })

  it('joins changes in the same word into one', function () {
    const out = wordDiff([u('x '), d('a'), i('b'), u('c'), d('d'), i('e'), u(' y')])
    expect(shape(out)).to.deep.equal(['=x ', '-acd', '+bce', '= y'])
  })

  it('treats accented letters as part of words', function () {
    const out = wordDiff([u('mình s'), d('ử'), i('ư'), u('a lại')])
    expect(shape(out)).to.deep.equal(['=mình ', '-sửa', '+sưa', '= lại'])
  })

  it('keeps the text unchanged overall', function () {
    const input = [u('\\title{A '), i('Big '), u('Stu'), d('y'), i('dy'), u('}\n')]
    const out = wordDiff(input)
    const newText = (cs: DocDiffChunk[]) => cs.map(c => c.u ?? c.i ?? '').join('')
    const oldText = (cs: DocDiffChunk[]) => cs.map(c => c.u ?? c.d ?? '').join('')
    expect(newText(out)).to.equal(newText(input))
    expect(oldText(out)).to.equal(oldText(input))
  })
})
