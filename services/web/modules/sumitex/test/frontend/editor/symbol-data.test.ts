import { expect } from 'chai'
import {
  ALL_SYMBOLS,
  findSymbols,
  symbolText,
} from '../../../frontend/js/editor/symbols/symbol-data'

describe('SumiTeX symbol picker: finding and inserting symbols', function () {
  it('finds a symbol by part of its name, its look or a word', function () {
    expect(findSymbols('lam')[0].tex).to.equal('\\lambda')
    expect(findSymbols('λ')[0].tex).to.equal('\\lambda')
    expect(findSymbols('\\leq')[0].tex).to.equal('\\leq')
    expect(findSymbols('infinity').map(s => s.tex)).to.include('\\infty')
    expect(findSymbols('qqqq')).to.deep.equal([])
  })

  it('says which symbols need amssymb', function () {
    const need = ALL_SYMBOLS.filter(s => s.package === 'amssymb').map(s => s.tex)
    expect(need).to.include.members(['\\mathbb{R}', '\\leqslant', '\\therefore'])
    expect(ALL_SYMBOLS.find(s => s.tex === '\\alpha')?.package).to.equal(undefined)
  })

  it('keeps a command apart from a letter after it', function () {
    expect(symbolText('\\alpha', 'x')).to.equal('\\alpha ')
    expect(symbolText('\\alpha', '+')).to.equal('\\alpha')
    expect(symbolText('\\mathbb{R}', 'x')).to.equal('\\mathbb{R}')
  })
})
