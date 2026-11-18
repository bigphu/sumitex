import { expect } from 'chai'
import { parseSnippets } from '../../../frontend/js/snippets/format'
import { renderBody, renderLabel } from '../../../frontend/js/snippets/render'
import {
  builtinDefs,
  expansionAt,
  menuPresets,
  sizeHint,
  snippetDefs,
} from '../../../frontend/js/snippets/registry'
import { BUILTIN_FILES } from '../../../frontend/js/snippets/builtin'

describe('SumiTeX snippets: format', function () {
  it('reads a snippet with options, packages and preamble lines', function () {
    const { defs, problems } = parseSnippets(
      String.raw`\snippet[math,tab]{\lem}{Lemma}[amsthm]
\preamble{\newtheorem{lemma}{Lemma}}
\begin{lemma}#{}\end{lemma}
\endsnippet`,
      'project'
    )
    expect(problems).to.deep.equal([])
    expect(defs[0]).to.include({ trigger: '\\lem', where: 'math', mode: 'tab' })
    expect(defs[0].packages).to.deep.equal(['amsthm'])
    expect(defs[0].preamble).to.deep.equal(['\\newtheorem{lemma}{Lemma}'])
    expect(defs[0].body).to.equal('\\begin{lemma}#{}\\end{lemma}')
  })

  it('reads one-line shortcuts as math, as you type', function () {
    const { defs } = parseSnippets(
      String.raw`\shortcut{//}{\frac{#{}}{#{}}#{}}`,
      'personal'
    )
    expect(defs[0]).to.include({ trigger: '//', where: 'math', mode: 'auto' })
    expect(defs[0].body).to.equal('\\frac{#{}}{#{}}#{}')
  })

  it('reports bad headers, options and ranges by line', function () {
    const { problems } = parseSnippets(
      String.raw`\snippet[sideways]{\a}{A}
x
\endsnippet
\snippet{nobackslash}{B}
y
\endsnippet
\snippet[math,auto]{m#{n:1-12}}{C}
z
\endsnippet
\snippet{\open}{D}`,
      'project'
    )
    expect(problems.map(p => p.line)).to.deep.equal([1, 4, 7, 10])
  })
})

describe('SumiTeX snippets: render', function () {
  it('repeats rows and columns, with positions', function () {
    const def = { body: '\\rows{r}{  \\cols{c}{x@row@col}}' }
    expect(renderBody(def, { r: '2', c: '3' })).to.equal(
      '  x11 & x12 & x13 \\\\\n  x21 & x22 & x23'
    )
  })

  it('decides \\ifsame for an identity matrix', function () {
    const def = { body: '\\rows{n}{\\cols{n}{\\ifsame{@row}{@col}{1}{0}}}' }
    expect(renderBody(def, { n: '3' })).to.equal(
      '1 & 0 & 0 \\\\\n0 & 1 & 0 \\\\\n0 & 0 & 1'
    )
  })

  it('fills captures in labels but leaves other placeholders', function () {
    expect(
      renderLabel({ label: 'Table #{r} × #{c}' }, { r: '3', c: '4' })
    ).to.equal('Table 3 × 4')
    expect(renderBody({ body: '#{caption} #{r}' }, { r: '3' })).to.equal(
      '#{caption} 3'
    )
  })
})

describe('SumiTeX snippets: built-in library', function () {
  it('every built-in file reads without problems', function () {
    for (const [group, text] of BUILTIN_FILES) {
      const { problems } = parseSnippets(text, 'builtin', group)
      expect(problems, group).to.deep.equal([])
    }
  })

  it('has no trigger twice', function () {
    const triggers = builtinDefs().map(def => def.trigger)
    expect(triggers.filter((t, i) => triggers.indexOf(t) !== i)).to.deep.equal(
      []
    )
  })

  it('renders every built-in without leftover directives or bad placeholders', function () {
    for (const def of builtinDefs()) {
      const values = Object.fromEntries(
        def.captures.map(c => [
          c.name,
          c.kind === 'number' ? String(Math.min(3, c.max)) : 'x',
        ])
      )
      const out = renderBody(def, values)
      expect(out, def.trigger).not.to.match(
        /\\(rows|cols|lines|repeat|ifsame)\{/
      )
      expect(out, def.trigger).not.to.match(/#\{\d+\}|#\{[^}]*\{|@row|@col/)
    }
  })
})

describe('SumiTeX snippets: registry', function () {
  const sources = { project: null, personal: '', rules: '' }

  it('offers a sized menu snippet for the size typed', function () {
    const [first] = menuPresets(sources, '\\table3x4', 'text')
    expect(first.trigger).to.equal('\\table3x4')
    expect(first.template.match(/\\\\\n|\\\\$/gm)?.length).to.be.greaterThan(2)
    expect(menuPresets(sources, '\\table3x40', 'text')[0].trigger).to.equal(
      '\\fig'
    )
    expect(sizeHint(sources, '\\table')).to.equal('\\table3x3 for a size')
  })

  it('keeps math snippets to math', function () {
    const text = menuPresets(sources, '\\b', 'text').map(p => p.trigger)
    const math = menuPresets(sources, '\\b', 'math').map(p => p.trigger)
    expect(text).not.to.include('\\bmat')
    expect(math).to.include('\\bmat')
  })

  it('expands shortcuts at the start of a word, the longest first', function () {
    expect(expansionAt(sources, 'x = mat2x3', 'math', 'auto')?.typed).to.equal(
      'mat2x3'
    )
    expect(expansionAt(sources, 'x \\sq', 'math', 'auto')).to.equal(null)
    expect(expansionAt(sources, 'xsq', 'math', 'auto')).to.equal(null)
    expect(expansionAt(sources, 'a <=', 'math', 'auto')?.template).to.equal(
      '\\leq'
    )
    expect(expansionAt(sources, 'mat2x3', 'text', 'auto')).to.equal(null)
  })

  it('lets your snippets replace or switch off built-in ones', function () {
    const mine = {
      ...sources,
      personal: String.raw`\shortcut{EE}{\mathbb{E}\,}`,
      rules: 'mat\nsq \\sqrt',
    }
    expect(expansionAt(mine, ' EE', 'math', 'auto')?.template).to.equal(
      '\\mathbb{E}\\,'
    )
    expect(expansionAt(mine, ' mat2x2', 'math', 'auto')).to.equal(null)
    expect(expansionAt(mine, ' sq', 'math', 'auto')?.template).to.equal(
      '\\sqrt'
    )
    expect(snippetDefs(mine).filter(d => d.trigger === 'EE')).to.have.length(1)
  })
})
