import { expect } from 'chai'
import { parseSnippets } from '../../../frontend/js/snippets/format'
import { builtinDefs, parseRules } from '../../../frontend/js/snippets/registry'

describe('snippet descriptions and subjects', function () {
  it('reads a shortcut’s description from the end of its line', function () {
    const { defs, problems } = parseSnippets(
      String.raw`\shortcut{//}{\frac{#{}}{#{}}#{}}   % Fraction`,
      'project'
    )
    expect(problems).to.have.length(0)
    expect(defs[0]).to.include({ trigger: '//', description: 'Fraction' })
  })

  it('takes the subject from the comment heading above, up to a colon', function () {
    const { defs } = parseSnippets(
      String.raw`% Greek: @ and a letter
\shortcut{@a}{\alpha}   % alpha

% Arrows and relations.
\shortcut{->}{\to}`,
      'project'
    )
    expect(defs.map(d => [d.trigger, d.tag, d.description])).to.deep.equal([
      ['@a', 'Greek', 'alpha'],
      ['->', 'Arrows and relations', undefined],
    ])
  })

  it('gives every built-in math shortcut a description and a subject', function () {
    const shortcuts = builtinDefs().filter(
      def => def.mode !== 'menu' && def.where !== 'text' && !def.pattern
    )
    expect(shortcuts.length).to.be.greaterThan(80)
    const missing = shortcuts.filter(def => !def.description || !def.tag)
    expect(missing.map(def => def.trigger)).to.deep.equal([])
  })

  it('reads a description at the end of one of your rules, not an escaped %', function () {
    const { rules, off } = parseRules(
      String.raw`@w \omega % omega
pct 50\% off
sq`
    )
    expect(rules).to.deep.equal([
      { trigger: '@w', replacement: '\\omega', description: 'omega' },
      { trigger: 'pct', replacement: '50\\% off', description: undefined },
    ])
    expect([...off]).to.deep.equal(['sq'])
  })
})
