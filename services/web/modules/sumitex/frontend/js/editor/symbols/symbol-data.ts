/**
 * The symbols the symbol picker offers (mockup frame 31), in its groups,
 * and the structures (fraction, root…) of the equation pop-up's toolbar.
 * A symbol from amssymb names it, and inserting it loads the package.
 */

export type MathSymbol = {
  /** What it looks like */
  char: string
  /** What goes in, without the backslash's surroundings */
  tex: string
  /** More words to find it by */
  words?: string
  package?: string
}

export type SymbolGroup = { key: string; title: string; symbols: MathSymbol[] }

const s = (char: string, tex: string, words = '', pkg?: string): MathSymbol => ({
  char,
  tex,
  words,
  ...(pkg ? { package: pkg } : {}),
})
const ams = (char: string, tex: string, words = '') => s(char, tex, words, 'amssymb')

export const SYMBOL_GROUPS: SymbolGroup[] = [
  {
    key: 'greek',
    title: 'Greek',
    symbols: [
      s('α', '\\alpha'), s('β', '\\beta'), s('γ', '\\gamma'), s('δ', '\\delta'),
      s('ε', '\\varepsilon', 'epsilon'), s('ζ', '\\zeta'), s('η', '\\eta'), s('θ', '\\theta'),
      s('ϑ', '\\vartheta', 'theta'), s('λ', '\\lambda'), s('μ', '\\mu'), s('ξ', '\\xi'),
      s('π', '\\pi'), s('ρ', '\\rho'), s('σ', '\\sigma'), s('τ', '\\tau'),
      s('φ', '\\varphi', 'phi'), s('χ', '\\chi'), s('ψ', '\\psi'), s('ω', '\\omega'),
      s('ι', '\\iota'), s('κ', '\\kappa'), s('ν', '\\nu'), s('υ', '\\upsilon'),
      s('Γ', '\\Gamma'), s('Δ', '\\Delta'), s('Θ', '\\Theta'), s('Λ', '\\Lambda'),
      s('Σ', '\\Sigma', 'sigma'), s('Φ', '\\Phi'), s('Ψ', '\\Psi'), s('Ω', '\\Omega'),
      s('Ξ', '\\Xi'), s('Π', '\\Pi'), s('ϵ', '\\epsilon'), s('ϕ', '\\phi'),
      ams('ϝ', '\\digamma'), ams('ϰ', '\\varkappa', 'kappa'),
    ],
  },
  {
    key: 'arrows',
    title: 'Arrows',
    symbols: [
      s('→', '\\to', 'right arrow'), s('←', '\\leftarrow', 'left arrow'),
      s('↔', '\\leftrightarrow'), s('⇒', '\\Rightarrow', 'implies'),
      s('⇐', '\\Leftarrow'), s('⇔', '\\iff', 'if and only if'),
      s('↦', '\\mapsto', 'maps to'), s('⟶', '\\longrightarrow'),
      s('↑', '\\uparrow', 'up'), s('↓', '\\downarrow', 'down'),
      s('↗', '\\nearrow'), s('↘', '\\searrow'), s('⇀', '\\rightharpoonup'),
      s('↪', '\\hookrightarrow', 'embedding'),
      ams('↠', '\\twoheadrightarrow', 'onto surjection'),
      ams('⇝', '\\rightsquigarrow', 'leads to'),
    ],
  },
  {
    key: 'operators',
    title: 'Operators',
    symbols: [
      s('±', '\\pm', 'plus minus'), s('∓', '\\mp'), s('×', '\\times', 'multiply'),
      s('÷', '\\div', 'divide'), s('·', '\\cdot', 'dot multiply'), s('∘', '\\circ', 'compose'),
      s('Σ', '\\sum', 'sum'), s('∏', '\\prod', 'product'), s('∫', '\\int', 'integral'),
      s('∬', '\\iint', 'double integral'), s('∮', '\\oint', 'contour integral'),
      s('∂', '\\partial', 'derivative'), s('∇', '\\nabla', 'gradient'),
      s('√', '\\sqrt{}', 'root square'), s('∪', '\\cup', 'union'), s('∩', '\\cap', 'intersection'),
      s('⊕', '\\oplus'), s('⊗', '\\otimes', 'tensor'), s('∧', '\\wedge', 'and'),
      s('∨', '\\vee', 'or'), s('¬', '\\neg', 'not'), s('∖', '\\setminus', 'minus'),
      s('⋃', '\\bigcup', 'union'), s('⋂', '\\bigcap', 'intersection'),
    ],
  },
  {
    key: 'relations',
    title: 'Relations',
    symbols: [
      s('≤', '\\leq', 'less equal'), s('≥', '\\geq', 'greater equal'),
      s('≠', '\\neq', 'not equal'), s('≈', '\\approx', 'approximately'),
      s('≡', '\\equiv', 'equivalent'), s('∼', '\\sim', 'similar'),
      s('≃', '\\simeq'), s('≅', '\\cong', 'congruent'), s('∝', '\\propto', 'proportional'),
      s('≪', '\\ll', 'much less'), s('≫', '\\gg', 'much greater'),
      s('∈', '\\in', 'element'), s('∉', '\\notin', 'not element'),
      s('⊂', '\\subset', 'subset'), s('⊆', '\\subseteq'), s('⊃', '\\supset'),
      s('⊇', '\\supseteq'), s('⊥', '\\perp', 'perpendicular'), s('∥', '\\parallel'),
      s('∣', '\\mid', 'divides'),
      ams('⩽', '\\leqslant', 'less equal'), ams('⩾', '\\geqslant', 'greater equal'),
      ams('≲', '\\lesssim'), ams('≳', '\\gtrsim'),
    ],
  },
  {
    key: 'misc',
    title: 'Misc',
    symbols: [
      s('ℝ', '\\mathbb{R}', 'real numbers', 'amssymb'),
      s('ℕ', '\\mathbb{N}', 'natural numbers', 'amssymb'),
      s('ℤ', '\\mathbb{Z}', 'integers', 'amssymb'),
      s('ℚ', '\\mathbb{Q}', 'rationals', 'amssymb'),
      s('ℂ', '\\mathbb{C}', 'complex numbers', 'amssymb'),
      s('∞', '\\infty', 'infinity'), s('∀', '\\forall', 'for all'),
      s('∃', '\\exists', 'exists'), s('∅', '\\emptyset', 'empty'),
      s('ℓ', '\\ell'), s('ℏ', '\\hbar', 'planck'), s('ℜ', '\\Re', 'real part'),
      s('ℑ', '\\Im', 'imaginary part'), s('ℵ', '\\aleph'), s('′', "'", 'prime'),
      s('…', '\\ldots', 'dots'), s('⋯', '\\cdots', 'dots'), s('⋮', '\\vdots'),
      s('⋱', '\\ddots'), s('⟨', '\\langle', 'angle bracket'), s('⟩', '\\rangle'),
      ams('∴', '\\therefore'), ams('∵', '\\because'), ams('∄', '\\nexists', 'not exists'),
      ams('∅', '\\varnothing', 'empty'), ams('□', '\\square', 'qed'),
      ams('■', '\\blacksquare', 'qed'), ams('✓', '\\checkmark', 'tick'),
    ],
  },
]

export const ALL_SYMBOLS = SYMBOL_GROUPS.flatMap(group => group.symbols)

/** Symbols whose LaTeX, look or words match what was typed */
export function findSymbols(query: string) {
  const q = query.trim().toLowerCase().replace(/^\\/, '')
  if (!q) return []
  const scored = ALL_SYMBOLS.map(symbol => {
    const name = symbol.tex.replace(/^\\/, '').toLowerCase()
    const score =
      symbol.char === query.trim()
        ? 0
        : name.startsWith(q)
          ? 1
          : name.includes(q)
            ? 2
            : (symbol.words ?? '').toLowerCase().includes(q)
              ? 3
              : -1
    return { symbol, score }
  })
  const seen = new Set<string>()
  return scored
    .filter(({ score }) => score >= 0)
    .sort((a, b) => a.score - b.score)
    .map(({ symbol }) => symbol)
    .filter(symbol => !seen.has(symbol.tex) && seen.add(symbol.tex))
}

// Recently used, per browser
const RECENT_KEY = 'sumitex.symbols.recent'
const RECENT_MAX = 16

export function recentSymbols(): MathSymbol[] {
  try {
    const names = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]
    return names.flatMap(tex => ALL_SYMBOLS.find(symbol => symbol.tex === tex) ?? [])
  } catch {
    return []
  }
}

export function rememberSymbol(symbol: MathSymbol) {
  try {
    const names = [symbol.tex, ...recentSymbols().map(s => s.tex).filter(t => t !== symbol.tex)]
    localStorage.setItem(RECENT_KEY, JSON.stringify(names.slice(0, RECENT_MAX)))
  } catch {
    // storage blocked: no recent list
  }
}

/**
 * The equation pop-up's toolbar: structures, where | marks where the
 * cursor goes, and the most used symbols
 */
export const STRUCTURES = [
  { label: 'a⁄b', title: 'Fraction', tex: '\\frac{|}{}' },
  { label: '√', title: 'Square root', tex: '\\sqrt{|}' },
  { label: 'xⁿ', title: 'Superscript', tex: '^{|}' },
  { label: 'xₙ', title: 'Subscript', tex: '_{|}' },
  { label: 'Σ', title: 'Sum with limits', tex: '\\sum_{|}^{}' },
  { label: '∫', title: 'Integral with limits', tex: '\\int_{|}^{}' },
  { label: '( )', title: 'Brackets that grow', tex: '\\left( | \\right)' },
  { label: 'Aa', title: 'Text', tex: '\\text{|}' },
]

export const FREQUENT = ['\\alpha', '\\beta', '\\theta', '\\pi', '\\infty', '\\leq', '\\geq', '\\neq', '\\to', '\\times']
  .map(tex => ALL_SYMBOLS.find(symbol => symbol.tex === tex)!)

/**
 * The text that goes in for a symbol after `before`: a space after a
 * command name when a letter follows, so \alpha x doesn't run together
 */
export function symbolText(tex: string, after: string) {
  return /^\\[A-Za-z]+$/.test(tex) && /^[A-Za-z]/.test(after) ? `${tex} ` : tex
}
