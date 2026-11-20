/**
 * Equations as people read them, for the Outline:
 *
 * - mathTitle: a row's title in plain Unicode, as the mockup draws it
 *   (frame 12): \hat{\theta} = \arg\min ... reads θ̂ = arg min …, with
 *   Greek letters, operators, sub- and superscripts. Several lines (align)
 *   are joined with " ; ". Anything it doesn't know keeps its name
 *   without the backslash, so a row never shows LaTeX syntax.
 * - previewTex: what MathJax draws for a preview, so it matches the PDF:
 *   align and its kin as aligned (the & lines up, \\ breaks), gather as
 *   gathered, without the \label.
 */

const SYMBOLS: Record<string, string> = {
  // Greek
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ', rho: 'ρ',
  varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ', phi: 'ϕ',
  varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  // Big operators
  sum: 'Σ', prod: '∏', coprod: '∐', int: '∫', iint: '∬', iiint: '∭', oint: '∮',
  bigcup: '⋃', bigcap: '⋂', bigoplus: '⨁', bigotimes: '⨂',
  // Relations
  leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈',
  equiv: '≡', sim: '∼', simeq: '≃', cong: '≅', propto: '∝', ll: '≪', gg: '≫',
  in: '∈', notin: '∉', ni: '∋', subset: '⊂', subseteq: '⊆', supset: '⊃',
  supseteq: '⊇', perp: '⊥', mid: '∣', parallel: '∥',
  // Arrows
  to: '→', rightarrow: '→', leftarrow: '←', gets: '←', leftrightarrow: '↔',
  Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', implies: '⇒',
  impliedby: '⇐', iff: '⇔', mapsto: '↦', uparrow: '↑', downarrow: '↓',
  longrightarrow: '⟶', longmapsto: '⟼',
  // Operators and the rest
  pm: '±', mp: '∓', times: '×', div: '÷', cdot: '·', ast: '∗', star: '⋆',
  circ: '∘', bullet: '•', oplus: '⊕', otimes: '⊗', cup: '∪', cap: '∩',
  wedge: '∧', land: '∧', vee: '∨', lor: '∨', neg: '¬', lnot: '¬',
  setminus: '∖', infty: '∞', partial: '∂', nabla: '∇', forall: '∀',
  exists: '∃', emptyset: '∅', varnothing: '∅', ell: 'ℓ', hbar: 'ℏ',
  Re: 'ℜ', Im: 'ℑ', aleph: 'ℵ', prime: '′', angle: '∠', top: '⊤', bot: '⊥',
  ldots: '…', cdots: '⋯', dots: '…', vdots: '⋮', ddots: '⋱',
  langle: '⟨', rangle: '⟩', lceil: '⌈', rceil: '⌉', lfloor: '⌊', rfloor: '⌋',
  lvert: '|', rvert: '|', lVert: '‖', rVert: '‖', vert: '|', Vert: '‖',
  quad: ' ', qquad: '  ', ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ',
  '{': '{', '}': '}', '%': '%', '&': '&', '#': '#', _: '_', $: '$',
}

// Named functions read as their name: \sin, \arg\min, \lim…
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'log', 'ln', 'lg', 'exp', 'min', 'max', 'sup',
  'inf', 'lim', 'liminf', 'limsup', 'arg', 'argmin', 'argmax', 'det', 'dim',
  'gcd', 'deg', 'ker', 'Pr', 'hom', 'tr', 'var', 'cov',
])

// Letters drawn differently: \mathbb{R} → ℝ
const BLACKBOARD: Record<string, string> = {
  C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ', E: '𝔼', '1': '𝟙',
}

// Accents as combining marks: \hat{\theta} → θ̂
const ACCENTS: Record<string, string> = {
  hat: '̂', widehat: '̂', bar: '̄', overline: '̅',
  tilde: '̃', widetilde: '̃', dot: '̇', ddot: '̈',
  vec: '⃗', check: '̌', breve: '̆', acute: '́',
  grave: '̀', mathring: '̊',
}

const SUPER: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶',
  '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽',
  ')': '⁾', n: 'ⁿ', i: 'ⁱ', T: 'ᵀ', a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ',
  f: 'ᶠ', g: 'ᵍ', h: 'ʰ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', o: 'ᵒ', p: 'ᵖ',
  r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
  '′': '′', '*': '*',
}
const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆',
  '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍',
  ')': '₎', a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ',
  n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
  β: 'ᵦ', γ: 'ᵧ', ρ: 'ᵨ', ϕ: 'ᵩ', χ: 'ᵪ',
}

/** A script in small characters when all of it has them, else ^(…) / _(…) */
function script(text: string, table: Record<string, string>, mark: string) {
  const plain = text.replace(/\s+/g, '')
  if ([...plain].every(char => char in table)) {
    return [...plain].map(char => table[char]).join('')
  }
  return [...plain].length === 1 ? `${mark}${plain}` : `${mark}(${plain})`
}

/** The {…} group at `at` in `text` (or the single token there) */
function argument(text: string, at: number): { body: string; end: number } {
  let i = at
  while (text[i] === ' ') i++
  if (text[i] === '{') {
    let depth = 0
    for (let j = i; j < text.length; j++) {
      if (text[j] === '\\') {
        j++
        continue
      }
      if (text[j] === '{') depth++
      else if (text[j] === '}' && --depth === 0) {
        return { body: text.slice(i + 1, j), end: j + 1 }
      }
    }
    return { body: text.slice(i + 1), end: text.length }
  }
  if (text[i] === '\\') {
    const name = /^\\([A-Za-z]+|.)/.exec(text.slice(i))
    if (name) return { body: name[0], end: i + name[0].length }
  }
  return { body: text[i] ?? '', end: i + 1 }
}

/** An equation's LaTeX as readable Unicode, for the Outline's rows */
export function mathTitle(tex: string): string {
  const text = tex
    .replace(/%[^\n]*/g, '')
    .replace(/\\(label|tag|nonumber|notag)\*?(\{[^}]*\})?/g, '')
    .replace(/\\begin\{[^}]*\}(\{[^}]*\})?|\\end\{[^}]*\}/g, ' ')
  let out = ''
  for (let i = 0; i < text.length; ) {
    const char = text[i]
    if (char === '\\') {
      if (text[i + 1] === '\\') {
        // A line break in align: the lines read one after the other
        out += ' ; '
        i += 2
        while (text[i] === '[') i = text.indexOf(']', i) + 1 || text.length
        continue
      }
      const match = /^\\([A-Za-z]+|.)/.exec(text.slice(i))!
      const name = match[1]
      i += match[0].length
      if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
        const top = argument(text, i)
        const bottom = argument(text, top.end)
        i = bottom.end
        const wrap = (part: string) =>
          [...part].length > 1 ? `(${part})` : part
        out += `${wrap(mathTitle(top.body))}/${wrap(mathTitle(bottom.body))}`
      } else if (name === 'sqrt') {
        if (text[i] === '[') i = text.indexOf(']', i) + 1
        const body = argument(text, i)
        i = body.end
        const inside = mathTitle(body.body)
        out += [...inside].length > 1 ? `√(${inside})` : `√${inside}`
      } else if (name in ACCENTS) {
        const body = argument(text, i)
        i = body.end
        const inside = mathTitle(body.body)
        out += [...inside].length === 1 ? inside + ACCENTS[name] : inside
      } else if (name === 'mathbb') {
        const body = argument(text, i)
        i = body.end
        out += [...body.body].map(c => BLACKBOARD[c] ?? c).join('')
      } else if (
        /^(math(rm|bf|it|sf|tt|cal|frak|scr)|text(rm|bf|it|sf|tt)?|operatorname\*?|boldsymbol|bm|mbox)$/.test(name)
      ) {
        // The letters, without the font
        const body = argument(text, i)
        i = body.end
        out += mathTitle(body.body)
      } else if (/^(left|right|big|Big|bigg|Bigg)[lr]?$/.test(name)) {
        // Sizes: just the bracket that follows
      } else if (name in SYMBOLS) {
        const symbol = SYMBOLS[name]
        const spaced = /^[≤≥≠≈≡∼≃≅∝∈∉⊂⊆⊃⊇→←↔⇒⇐⇔↦⟶±×÷]$/.test(symbol)
        out += spaced ? ` ${symbol} ` : symbol
      } else if (FUNCTIONS.has(name)) {
        out += ` ${name} `
      } else {
        out += name
      }
      continue
    }
    if (char === '^' || char === '_') {
      const body = argument(text, i + 1)
      i = body.end
      out += script(mathTitle(body.body), char === '^' ? SUPER : SUB, char)
      continue
    }
    if (char === '{' || char === '}' || char === '&' || char === '~') {
      i++
      if (char === '~') out += ' '
      continue
    }
    if (char === '=' || char === '<' || char === '>') {
      out += ` ${char} `
      i++
      continue
    }
    out += char === '\n' || char === '\t' ? ' ' : char
    i++
  }
  return out
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    // A script written out (_θ) belongs to what's before it: min_θ
    .replace(/ (?=[_^])/g, '')
    .trim()
}

// How each environment draws inside a display, as LaTeX lays it out
const WRAP: Record<string, string> = {
  align: 'aligned',
  flalign: 'aligned',
  alignat: 'alignedat',
  eqnarray: 'aligned',
  gather: 'gathered',
  multline: 'gathered',
}

/** What MathJax should draw for an equation of environment `name` */
export function previewTex(name: string, source: string) {
  const tex = source.replace(/\\label\s*\{[^}]*\}/g, '').trim()
  const wrap = WRAP[name.replace(/\*$/, '')]
  if (!wrap) return tex
  // eqnarray's &=& lines up like aligned's &=
  const body = name.startsWith('eqnarray') ? tex.replace(/&\s*([^&\\]*?)\s*&/g, '&$1') : tex
  return `\\begin{${wrap}}${body}\\end{${wrap}}`
}
