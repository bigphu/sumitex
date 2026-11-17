/**
 * What SumiTeX knows about LaTeX packages, for the live linter and the
 * "Add package" fixes (guide Phase 3; features list, 6):
 *
 * - which package provides a command or an environment, and which other
 *   packages provide it too (so \mathbb is fine with amsfonts or amssymb)
 * - which packages load others (mathtools loads amsmath)
 * - what the common document classes load already (beamer loads amsmath)
 *
 * Kept to commands a writer meets often and where the answer is certain:
 * a missed warning costs less than a wrong one.
 */

/** A command or environment and the package to suggest for it */
export type Provider = {
  /** The package the fix adds */
  suggest: string
  /** Other packages that also provide it */
  alsoFrom?: string[]
}

const p = (suggest: string, ...alsoFrom: string[]): Provider => ({
  suggest,
  alsoFrom,
})

// The math family loads each other, so list them once
const AMSMATH = p('amsmath', 'mathtools')
const AMSSYMB = p('amssymb', 'amsfonts', 'unicode-math')
const XCOLOR = p('xcolor', 'color')
const GRAPHICX = p('graphicx', 'graphics')
const TIKZ = p('tikz', 'pgfplots')

/** Commands, without the backslash */
export const COMMANDS: Record<string, Provider> = {
  // graphicx
  includegraphics: GRAPHICX,
  rotatebox: GRAPHICX,
  scalebox: GRAPHICX,
  resizebox: GRAPHICX,
  // amsmath
  text: p('amsmath', 'amstext', 'mathtools'),
  tag: AMSMATH,
  notag: AMSMATH,
  eqref: AMSMATH,
  dfrac: AMSMATH,
  tfrac: AMSMATH,
  binom: AMSMATH,
  dbinom: AMSMATH,
  tbinom: AMSMATH,
  iint: AMSMATH,
  iiint: AMSMATH,
  operatorname: AMSMATH,
  DeclareMathOperator: AMSMATH,
  numberwithin: AMSMATH,
  boldsymbol: p('amsmath', 'amsbsy', 'mathtools'),
  xrightarrow: AMSMATH,
  xleftarrow: AMSMATH,
  intertext: AMSMATH,
  overset: AMSMATH,
  underset: AMSMATH,
  substack: AMSMATH,
  lvert: AMSMATH,
  rvert: AMSMATH,
  lVert: AMSMATH,
  rVert: AMSMATH,
  // amssymb and amsfonts
  mathbb: AMSSYMB,
  mathfrak: AMSSYMB,
  varnothing: AMSSYMB,
  nmid: AMSSYMB,
  checkmark: AMSSYMB,
  therefore: AMSSYMB,
  because: AMSSYMB,
  lesssim: AMSSYMB,
  gtrsim: AMSSYMB,
  leqslant: AMSSYMB,
  geqslant: AMSSYMB,
  blacksquare: AMSSYMB,
  // amsthm
  qedhere: p('amsthm'),
  theoremstyle: p('amsthm'),
  // mathtools
  coloneqq: p('mathtools'),
  DeclarePairedDelimiter: p('mathtools'),
  mathclap: p('mathtools'),
  // other maths
  bm: p('bm'),
  mathscr: p('mathrsfs'),
  nicefrac: p('nicefrac', 'units'),
  sfrac: p('xfrac'),
  // colour
  textcolor: XCOLOR,
  color: XCOLOR,
  colorbox: XCOLOR,
  definecolor: XCOLOR,
  // links
  href: p('hyperref'),
  hypersetup: p('hyperref'),
  texorpdfstring: p('hyperref'),
  phantomsection: p('hyperref'),
  autoref: p('hyperref'),
  url: p('url', 'hyperref', 'xurl'),
  cref: p('cleveref'),
  Cref: p('cleveref'),
  // citations
  citep: p('natbib', 'biblatex'),
  citet: p('natbib', 'biblatex'),
  citealt: p('natbib', 'biblatex'),
  citepalias: p('natbib'),
  citetalias: p('natbib'),
  addbibresource: p('biblatex'),
  printbibliography: p('biblatex'),
  parencite: p('biblatex'),
  textcite: p('biblatex'),
  autocite: p('biblatex'),
  // tables
  toprule: p('booktabs'),
  midrule: p('booktabs'),
  bottomrule: p('booktabs'),
  cmidrule: p('booktabs'),
  multirow: p('multirow'),
  arraybackslash: p('array', 'tabularx'),
  // units
  SI: p('siunitx'),
  si: p('siunitx'),
  num: p('siunitx'),
  qty: p('siunitx'),
  unit: p('siunitx'),
  // figures and floats
  subcaption: p('subcaption'),
  captionof: p('caption', 'capt-of', 'subcaption'),
  FloatBarrier: p('placeins'),
  includesvg: p('svg'),
  includepdf: p('pdfpages'),
  // code
  lstinline: p('listings'),
  lstset: p('listings'),
  mintinline: p('minted'),
  // drawing
  tikz: TIKZ,
  usetikzlibrary: TIKZ,
  addplot: p('pgfplots'),
  pgfplotsset: p('pgfplots'),
  // page layout
  geometry: p('geometry'),
  newgeometry: p('geometry'),
  onehalfspacing: p('setspace'),
  doublespacing: p('setspace'),
  singlespacing: p('setspace'),
  setstretch: p('setspace'),
  fancyhead: p('fancyhdr'),
  fancyfoot: p('fancyhdr'),
  fancyhf: p('fancyhdr'),
  titleformat: p('titlesec'),
  titlespacing: p('titlesec'),
  setlist: p('enumitem'),
  newlist: p('enumitem'),
  justifying: p('ragged2e'),
  RaggedRight: p('ragged2e'),
  // text
  todo: p('todonotes'),
  listoftodos: p('todonotes'),
  hl: p('soul'),
  sout: p('ulem'),
  uline: p('ulem'),
  enquote: p('csquotes'),
  ce: p('mhchem', 'chemformula'),
  lipsum: p('lipsum'),
  blindtext: p('blindtext'),
  xspace: p('xspace'),
  faIcon: p('fontawesome5'),
  newacronym: p('glossaries', 'glossaries-extra'),
  gls: p('glossaries', 'glossaries-extra'),
  nomenclature: p('nomencl'),
  tcbset: p('tcolorbox'),
}

/** Environments */
export const ENVIRONMENTS: Record<string, Provider> = {
  align: AMSMATH,
  'align*': AMSMATH,
  alignat: AMSMATH,
  'alignat*': AMSMATH,
  flalign: AMSMATH,
  'flalign*': AMSMATH,
  gather: AMSMATH,
  'gather*': AMSMATH,
  multline: AMSMATH,
  'multline*': AMSMATH,
  split: AMSMATH,
  cases: AMSMATH,
  matrix: AMSMATH,
  pmatrix: AMSMATH,
  bmatrix: AMSMATH,
  Bmatrix: AMSMATH,
  vmatrix: AMSMATH,
  Vmatrix: AMSMATH,
  subequations: AMSMATH,
  dcases: p('mathtools'),
  proof: p('amsthm'),
  tabularx: p('tabularx'),
  longtable: p('longtable'),
  subfigure: p('subcaption'),
  lstlisting: p('listings'),
  minted: p('minted'),
  algorithm: p('algorithm', 'algorithm2e'),
  algorithmic: p('algpseudocode', 'algorithmic', 'algorithmicx'),
  tikzpicture: TIKZ,
  axis: p('pgfplots'),
  wrapfigure: p('wrapfig'),
  multicols: p('multicol'),
  'multicols*': p('multicol'),
  tcolorbox: p('tcolorbox'),
  justify: p('ragged2e'),
  appendices: p('appendix'),
}

/** Packages that load others: loading the key loads every value */
export const LOADS: Record<string, string[]> = {
  mathtools: ['amsmath'],
  amsmath: ['amstext', 'amsbsy', 'amsopn'],
  amssymb: ['amsfonts'],
  'unicode-math': ['fontspec', 'amsfonts', 'amssymb'],
  tikz: ['pgf', 'xcolor', 'graphicx'],
  pgfplots: ['tikz', 'pgf', 'xcolor', 'graphicx'],
  hyperref: ['url'],
  graphicx: ['graphics'],
  subcaption: ['caption'],
  tabularx: ['array'],
  tcolorbox: ['pgf', 'xcolor'],
  minted: ['xcolor', 'fvextra'],
  algpseudocode: ['algorithmicx'],
  'glossaries-extra': ['glossaries'],
  svg: ['graphicx'],
  pdfpages: ['graphicx'],
}

/**
 * Document classes whose loaded packages are known. A class not listed
 * here (and not in the project) may load anything, so the linter stays
 * quiet for documents that use it.
 */
export const CLASSES: Record<string, string[]> = {
  article: [],
  report: [],
  book: [],
  letter: [],
  minimal: [],
  memoir: [],
  scrartcl: [],
  scrreprt: [],
  scrbook: [],
  scrlttr2: [],
  standalone: [],
  IEEEtran: [],
  amsart: ['amsmath', 'amsthm', 'amsfonts'],
  amsbook: ['amsmath', 'amsthm', 'amsfonts'],
  amsproc: ['amsmath', 'amsthm', 'amsfonts'],
  beamer: [
    'amsmath',
    'amssymb',
    'amsthm',
    'graphicx',
    'xcolor',
    'hyperref',
    'url',
  ],
}

/** Every package that \usepackage{name} brings in, name included */
export function withLoaded(names: Iterable<string>): Set<string> {
  const all = new Set<string>()
  const add = (name: string) => {
    if (all.has(name)) return
    all.add(name)
    for (const more of LOADS[name] ?? []) add(more)
  }
  for (const name of names) add(name)
  return all
}

/** The CTAN page for a package, for the fix's "About" link */
export const ctanUrl = (name: string) =>
  `https://ctan.org/pkg/${encodeURIComponent(name)}`
