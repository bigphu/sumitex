/**
 * The blocks of every .tex file in the project, for the palette's @
 * search (mockup frame 17: "@fig pipe"). The open file's come live from
 * the Outline's scan; the others are scanned from the project snapshot
 * (diagnostics/preamble-store.ts), each again only when its text changes.
 */
import { EditorState } from '@codemirror/state'
import { LanguageSupport } from '@codemirror/language'
import { LaTeXLanguage } from '@/features/source-editor/languages/latex/latex-language'
import { debugConsole } from '@/utils/debugging'
import { scanBlocks, type Block } from '../outline/scan-blocks'
import { getBlocks } from '../outline/blocks-store'
import { getProjectPreamble } from '../diagnostics/preamble-store'

export type ProjectBlock = { path: string; block: Block }

const cache = new Map<string, { text: string; blocks: Block[] }>()

function blocksOf(path: string, text: string) {
  const known = cache.get(path)
  if (known && known.text === text) return known.blocks
  let blocks: Block[] = []
  try {
    const state = EditorState.create({ doc: text, extensions: [new LanguageSupport(LaTeXLanguage)] })
    blocks = scanBlocks(state)
  } catch (error) {
    debugConsole.debug('SumiTeX: could not scan', path, error)
  }
  cache.set(path, { text, blocks })
  return blocks
}

/** The open file's blocks first, then the other files' in path order */
export function projectBlocks(): ProjectBlock[] {
  const { docs, currentPath } = getProjectPreamble()
  const open: ProjectBlock[] = getBlocks().map(block => ({ path: currentPath ?? '', block }))
  const others: ProjectBlock[] = []
  for (const [path, text] of [...(docs ?? new Map<string, string>())].sort(([a], [b]) => a.localeCompare(b))) {
    if (path === currentPath || !path.endsWith('.tex')) continue
    for (const block of blocksOf(path, text)) others.push({ path, block })
  }
  return [...open, ...others]
}

/** Words that narrow the search to one kind: "@fig pipe", "@eq loss" */
export const KIND_WORDS: Record<string, string> = {
  fig: 'figure',
  figure: 'figure',
  img: 'figure',
  tab: 'table',
  table: 'table',
  eq: 'equation',
  equation: 'equation',
  math: 'equation',
  list: 'list',
  code: 'code',
  lst: 'code',
  alg: 'code',
  algorithm: 'code',
  thm: 'theorem',
  theorem: 'theorem',
  lemma: 'theorem',
  def: 'theorem',
  proof: 'theorem',
  graph: 'graph',
  tikz: 'graph',
  plot: 'graph',
  note: 'note',
  todo: 'note',
}

/** The kind a query asks for, and the words left to match */
export function splitQuery(query: string): { kind: string | null; words: string } {
  const [first, ...rest] = query.trim().split(/\s+/)
  const kind = first ? KIND_WORDS[first.toLowerCase()] : undefined
  return kind ? { kind, words: rest.join(' ') } : { kind: null, words: query }
}
