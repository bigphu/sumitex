/**
 * Finds the blocks of the open file for the Outline (guide Phase 6,
 * features list 11, v1): figures, tables, graphs, lists, equations, code,
 * theorems and notes, from the syntax tree, so nothing in a comment or in
 * verbatim counts.
 *
 * - Only top-level blocks: a tabular inside a table, a subfigure inside a
 *   figure or an equation inside a proof belong to the block around them.
 * - Problems, shown as a dot: a figure or table without a caption or a
 *   label, and a label that nothing in this file refers to (a hint only:
 *   other files, or a macro, may refer to it).
 */
import { EditorState } from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import { SyntaxNode, SyntaxNodeRef } from '@lezer/common'
import { getEnvironmentName } from '@/features/source-editor/utils/tree-operations/environments'
import {
  BlockKind,
  ENVIRONMENT_KINDS,
  friendlyName,
  NEEDS_CAPTION,
} from './block-types'
import { parseSpec, tableAt } from '../editor/table-columns'
import { mathTitle } from './math-text'

export type Block = {
  kind: BlockKind
  /** The environment (figure, align…), or \[ \] and \todo */
  name: string
  /** What the row says: the caption, a title, the formula… */
  title: string
  /** 1-based lines, as the outline uses */
  line: number
  endLine: number
  from: number
  to: number
  label?: string
  caption?: string
  problems: string[]
  /** Tables: data rows and columns */
  size?: { rows: number; columns: number }
  /** Lists: how many items */
  items?: number
  /** Figures: the first \includegraphics path */
  image?: string
  /** Equations: the math, for the preview */
  math?: string
}

const TITLE_LENGTH = 60
const TABULARS = new Set([
  'tabular',
  'tabular*',
  'tabularx',
  'tabulary',
  'longtable',
])

/** A caption or title as plain text: commands and braces taken out */
export function plainText(latex: string) {
  return latex
    .replace(/%[^\n]*/g, '')
    .replace(/\\(label|ref|cref|Cref|eqref|cite)\*?\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, '')
    .replace(/\\(.)/g, '$1')
    .replace(/[{}~$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const shorten = (text: string, length = TITLE_LENGTH) =>
  text.length > length ? text.slice(0, length - 1).trimEnd() + '…' : text

/** The text inside a node's { } argument */
function argumentText(state: EditorState, node: SyntaxNode | null) {
  if (!node) return ''
  const text = state.sliceDoc(node.from, node.to)
  return text.replace(/^\s*\{/, '').replace(/\}\s*$/, '')
}

/** \begin{name}[…] options, read as text (lstlisting, tcolorbox, theorem) */
function beginOptions(state: EditorState, env: SyntaxNode) {
  const begin = env.getChild('BeginEnv')
  if (!begin) return ''
  const after = state.sliceDoc(
    begin.getChild('EnvNameGroup')?.to ?? begin.to,
    Math.min(env.to, begin.to + 400)
  )
  const match = after.match(/^\s*\[((?:[^[\]]|\[[^\]]*\])*)\]/)
  return match ? match[1] : ''
}

const option = (options: string, key: string) => {
  const match = options.match(
    new RegExp(
      `(?:^|,)\\s*${key}\\s*=\\s*(\\{((?:[^{}]|\\{[^{}]*\\})*)\\}|[^,]*)`
    )
  )
  return match ? (match[2] ?? match[1]).trim() : ''
}

type Open = {
  block: Block | null
  node: SyntaxNode
  depth: number
  captions: { depth: number; text: string }[]
  labels: { depth: number; text: string }[]
}

/** \[ … \] (and $$ … $$) */
const isDisplayMath = (node: SyntaxNode) =>
  node.type.is('BracketMath') || node.type.is('DisplayMath')

const tree = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 400) ?? syntaxTree(state)

export function scanBlocks(state: EditorState): Block[] {
  const blocks: Block[] = []
  const referenced = new Set<string>()
  const open: Open[] = []
  let depth = 0
  // \[ \] blocks this scan opened (one nested in another block opens none)
  const displayOpened = new Set<number>()
  // The innermost environment of any kind, to count a list's own items
  const environments: SyntaxNode[] = []

  const lineOf = (pos: number) => state.doc.lineAt(pos).number
  const topBlock = () => open.find(entry => entry.block)?.block ?? null
  const innermostOpen = () => open[open.length - 1]

  const start = (node: SyntaxNode, kind: BlockKind, name: string) => {
    const block: Block = {
      kind,
      name,
      title: '',
      line: lineOf(node.from),
      endLine: lineOf(node.to),
      from: node.from,
      to: node.to,
      problems: [],
    }
    open.push({ block, node, depth, captions: [], labels: [] })
    return block
  }

  tree(state).iterate({
    enter(ref: SyntaxNodeRef) {
      const node = ref.node
      if (node.type.is('Comment')) return false

      if (node.type.is('$Environment')) {
        depth++
        environments.push(node)
        const name = getEnvironmentName(node, state) ?? ''
        const kind = ENVIRONMENT_KINDS[name]
        if (kind && !topBlock()) {
          const block = start(node, kind, name)
          if (kind === 'equation') {
            const begin = node.getChild('BeginEnv')
            const end = node.getChild('EndEnv')
            if (begin && end) block.math = state.sliceDoc(begin.to, end.from)
          }
          if (kind === 'code' || kind === 'theorem' || kind === 'note') {
            const options = beginOptions(state, node)
            block.caption =
              plainText(
                option(options, 'caption') || option(options, 'title')
              ) || undefined
            if (kind === 'theorem' && options && !/=/.test(options)) {
              block.title = plainText(options)
            }
            const language = option(options, 'language')
            if (!block.caption && language) block.title = language
            if (name === 'minted') {
              const begin = node.getChild('BeginEnv')
              const arg = begin
                ? state
                    .sliceDoc(begin.to, Math.min(node.to, begin.to + 60))
                    .match(/^\s*\{([^}]*)\}/)
                : null
              if (arg) block.title = arg[1]
            }
          }
        } else {
          open.push({ block: null, node, depth, captions: [], labels: [] })
        }
        return
      }

      if (isDisplayMath(node) && !topBlock()) {
        const block = start(node, 'equation', '\\[ \\]')
        block.math = state
          .sliceDoc(node.from, node.to)
          .replace(/^\\\[|^\$\$/, '')
          .replace(/\\\]$|\$\$$/, '')
        // DisplayMath isn't an environment: leave() closes it
        displayOpened.add(node.from)
        return
      }

      if (node.type.is('Caption')) {
        const entry = [...open].reverse().find(item => item.block) ?? null
        const text = argumentText(state, node.getChild('TextArgument'))
        if (entry) entry.captions.push({ depth, text })
        return false
      }

      if (node.type.is('Label')) {
        const entry = [...open].reverse().find(item => item.block) ?? null
        const text = argumentText(
          state,
          node.getChild('LabelArgument')?.getChild('ShortTextArgument') ?? null
        ).trim()
        if (entry && text) entry.labels.push({ depth, text })
        return false
      }

      if (node.type.is('Ref')) {
        const text = argumentText(
          state,
          node.getChild('RefArgument')?.getChild('ShortTextArgument') ?? null
        )
        for (const label of text.split(',')) {
          if (label.trim()) referenced.add(label.trim())
        }
        return false
      }

      if (node.type.is('Item')) {
        const list = environments[environments.length - 1]
        const block = topBlock()
        if (
          block &&
          block.kind === 'list' &&
          list &&
          list.from === block.from
        ) {
          block.items = (block.items ?? 0) + 1
        }
        return
      }

      if (node.type.is('IncludeGraphics')) {
        const block = topBlock()
        const path = node
          .getChild('IncludeGraphicsArgument')
          ?.getChild('FilePathArgument')
          ?.getChild('LiteralArgContent')
        if (block && block.kind === 'figure' && path && !block.image) {
          block.image = state.sliceDoc(path.from, path.to)
        }
        return false
      }

      // \todo{…} as a note (not inside another block)
      if (
        (node.type.name === 'UnknownCommand' ||
          node.type.name === 'KnownCommand') &&
        !topBlock() &&
        /^\\todo(?![A-Za-z])/.test(state.sliceDoc(node.from, node.from + 6))
      ) {
        const text = state.sliceDoc(node.from, node.to)
        const body = text.match(/\{((?:[^{}]|\{[^{}]*\})*)\}\s*$/)
        blocks.push({
          kind: 'note',
          name: '\\todo',
          title: shorten(plainText(body ? body[1] : '') || 'To do'),
          line: lineOf(node.from),
          endLine: lineOf(node.to),
          from: node.from,
          to: node.to,
          problems: [],
        })
        return false
      }
    },

    leave(ref: SyntaxNodeRef) {
      const node = ref.node
      const isEnvironment = node.type.is('$Environment')
      if (isEnvironment) {
        depth--
        environments.pop()
      } else if (!(isDisplayMath(node) && displayOpened.delete(node.from))) {
        return
      }
      {
        const entry = open.pop()
        if (!entry?.block) return
        const block = entry.block
        // The main caption and label are the outermost ones (a figure's,
        // not its subfigures'); of several at that level, the last
        const pick = (list: { depth: number; text: string }[]) => {
          if (!list.length) return undefined
          const shallowest = Math.min(...list.map(item => item.depth))
          return list.filter(item => item.depth === shallowest).pop()!.text
        }
        const caption = pick(entry.captions)
        if (caption !== undefined) block.caption = plainText(caption)
        block.label = pick(entry.labels)
        blocks.push(block)
      }
    },
  })

  for (const block of blocks) {
    if (block.kind === 'table') {
      const tabular = TABULARS.has(block.name)
        ? block.from + 1
        : (() => {
            const match = state
              .sliceDoc(block.from, block.to)
              .search(/\\begin\{(tabular\*?|tabularx|tabulary|longtable)\}/)
            return match >= 0 ? block.from + match + 2 : -1
          })()
      if (tabular >= 0) {
        const table = tableAt(state, tabular)
        if (table && !('error' in table)) {
          const spec = parseSpec(state.sliceDoc(table.spec.from, table.spec.to))
          block.size = {
            rows: table.rows.length,
            columns:
              'error' in spec
                ? Math.max(0, ...table.rows.map(row => row.cells.length))
                : spec.filter(token => token.column).length,
          }
        }
      }
    }

    if (!block.title) {
      if (block.caption) block.title = block.caption
      else if (block.kind === 'equation' && block.math) {
        // Readable math (θ̂ = arg min …), not LaTeX with the commands
        // stripped out
        block.title = mathTitle(block.math) || friendlyName(block.name, block.kind)
      } else if (block.kind === 'list') {
        const items = block.items ?? 0
        block.title = `${friendlyName(block.name, block.kind)}, ${items} ${
          items === 1 ? 'item' : 'items'
        }`
      } else if (block.label) block.title = block.label
      else if (block.kind === 'table' && block.size) {
        block.title = `${block.size.rows} × ${block.size.columns} table`
      } else if (block.kind === 'figure' && block.image) {
        block.title = block.image.split('/').pop() ?? block.image
      }
      else block.title = friendlyName(block.name, block.kind)
    }
    block.title = shorten(block.title)

    if (NEEDS_CAPTION.has(block.kind)) {
      if (!block.caption) block.problems.push('No caption')
      if (!block.label) block.problems.push('No label, so the text can’t refer to it')
    }
    if (
      block.label &&
      (NEEDS_CAPTION.has(block.kind) || block.kind === 'equation') &&
      !referenced.has(block.label)
    ) {
      block.problems.push('The text never refers to it')
    }
  }

  return blocks.sort((a, b) => a.from - b.from)
}
