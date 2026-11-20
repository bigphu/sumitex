/**
 * The kinds of block the Outline shows under its sections (guide Phase 6,
 * features list 11), and which LaTeX environments are which. To recognise
 * another environment, add its name to ENVIRONMENT_KINDS.
 */

export type BlockKind =
  | 'figure'
  | 'table'
  | 'graph'
  | 'list'
  | 'equation'
  | 'code'
  | 'theorem'
  | 'note'

export const BLOCK_KINDS: Record<
  BlockKind,
  { icon: string; name: string; plural: string }
> = {
  figure: { icon: 'image', name: 'Figure', plural: 'Figures' },
  table: { icon: 'table', name: 'Table', plural: 'Tables' },
  graph: { icon: 'insights', name: 'Graph', plural: 'Graphs' },
  list: { icon: 'format_list_bulleted', name: 'List', plural: 'Lists' },
  equation: { icon: 'function', name: 'Equation', plural: 'Equations' },
  code: { icon: 'code', name: 'Code', plural: 'Code' },
  theorem: { icon: 'verified', name: 'Theorem', plural: 'Theorems' },
  note: { icon: 'sticky_note_2', name: 'Note', plural: 'Notes' },
}

/** The order of the type filter */
export const KIND_ORDER: BlockKind[] = [
  'figure',
  'table',
  'graph',
  'list',
  'equation',
  'code',
  'theorem',
  'note',
]

export const ENVIRONMENT_KINDS: Record<string, BlockKind> = {
  figure: 'figure',
  'figure*': 'figure',
  wrapfigure: 'figure',
  subfigure: 'figure',

  table: 'table',
  'table*': 'table',
  tabular: 'table',
  'tabular*': 'table',
  tabularx: 'table',
  tabulary: 'table',
  longtable: 'table',

  tikzpicture: 'graph',
  axis: 'graph',
  tikzcd: 'graph',

  itemize: 'list',
  enumerate: 'list',
  description: 'list',

  equation: 'equation',
  'equation*': 'equation',
  align: 'equation',
  'align*': 'equation',
  gather: 'equation',
  'gather*': 'equation',
  multline: 'equation',
  'multline*': 'equation',
  flalign: 'equation',
  'flalign*': 'equation',

  lstlisting: 'code',
  minted: 'code',
  algorithm: 'code',
  'algorithm*': 'code',

  theorem: 'theorem',
  lemma: 'theorem',
  corollary: 'theorem',
  proposition: 'theorem',
  definition: 'theorem',
  remark: 'theorem',
  example: 'theorem',
  conjecture: 'theorem',
  claim: 'theorem',
  proof: 'theorem',
  thm: 'theorem',
  lem: 'theorem',
  defn: 'theorem',

  tcolorbox: 'note',
}

/**
 * What an environment is called in the Outline, in plain words, for
 * people who don't know LaTeX names. Others take their kind's name.
 */
const ENVIRONMENT_NAMES: Record<string, string> = {
  itemize: 'Bulleted list',
  enumerate: 'Numbered list',
  description: 'Description list',
  wrapfigure: 'Figure',
  subfigure: 'Sub-figure',
  tabular: 'Table',
  'tabular*': 'Table',
  tabularx: 'Table',
  tabulary: 'Table',
  longtable: 'Long table',
  tikzpicture: 'Drawing',
  axis: 'Plot',
  tikzcd: 'Diagram',
  align: 'Equations',
  'align*': 'Equations',
  gather: 'Equations',
  'gather*': 'Equations',
  multline: 'Equation',
  'multline*': 'Equation',
  flalign: 'Equations',
  'flalign*': 'Equations',
  lstlisting: 'Code',
  minted: 'Code',
  algorithm: 'Algorithm',
  'algorithm*': 'Algorithm',
  lemma: 'Lemma',
  corollary: 'Corollary',
  proposition: 'Proposition',
  definition: 'Definition',
  defn: 'Definition',
  remark: 'Remark',
  example: 'Example',
  conjecture: 'Conjecture',
  claim: 'Claim',
  proof: 'Proof',
  thm: 'Theorem',
  lem: 'Lemma',
  tcolorbox: 'Box',
  '\\todo': 'To do',
}

/** An environment's plain name: "itemize" → "Bulleted list" */
export const friendlyName = (environment: string, kind: BlockKind) =>
  ENVIRONMENT_NAMES[environment] ??
  BLOCK_KINDS[kind]?.name ??
  environment

/** Which kinds can have a caption and a label worth asking for */
export const NEEDS_CAPTION: ReadonlySet<BlockKind> = new Set([
  'figure',
  'table',
])
