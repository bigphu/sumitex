/**
 * The theorem edit pop-up's model: theorem, lemma, definition, proof…
 * read from the LaTeX, and each action as one edit (like table-model.ts).
 *
 * - The type renames the environment; a type the preamble doesn't define
 *   yet is offered with its \newtheorem line.
 * - The optional name ([Pythagoras]), the label and its use, the body.
 */
import type { EditorState } from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { getEnvironmentName } from '@/features/source-editor/utils/tree-operations/environments'
import { ENVIRONMENT_KINDS } from '../block-types'
import { cleanLabel, type Edit } from './table-model'
import { group, isReferenced, type Span, type Text } from './parts'

/** The types offered, with the \newtheorem line each needs */
export const THEOREM_TYPES: { name: string; title: string; preamble: string | null }[] = [
  { name: 'theorem', title: 'Theorem', preamble: '\\newtheorem{theorem}{Theorem}' },
  { name: 'lemma', title: 'Lemma', preamble: '\\newtheorem{lemma}{Lemma}' },
  { name: 'proposition', title: 'Proposition', preamble: '\\newtheorem{proposition}{Proposition}' },
  { name: 'corollary', title: 'Corollary', preamble: '\\newtheorem{corollary}{Corollary}' },
  { name: 'definition', title: 'Definition', preamble: '\\newtheorem{definition}{Definition}' },
  { name: 'example', title: 'Example', preamble: '\\newtheorem{example}{Example}' },
  { name: 'remark', title: 'Remark', preamble: '\\newtheorem{remark}{Remark}' },
  // amsthm defines proof itself
  { name: 'proof', title: 'Proof', preamble: null },
]

export type TheoremModel = {
  range: Span
  type: string
  names: Span[]
  /** The [name] group with brackets, or null; where a new one goes */
  title: { text: string; group: Span } | null
  titleAt: number
  body: Text
  label: Text | null
  referenced: boolean
}

const tree = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)

export function readTheorem(state: EditorState, pos: number): TheoremModel | null {
  let node: SyntaxNode | null = tree(state).resolveInner(pos, 1)
  for (; node; node = node.parent) {
    if (
      node.type.is('$Environment') &&
      ENVIRONMENT_KINDS[getEnvironmentName(node, state) ?? ''] === 'theorem'
    ) {
      break
    }
  }
  if (!node) return null
  const begin = node.getChild('BeginEnv')
  const end = node.getChild('EndEnv')
  if (!begin || !end) return null
  const text = state.doc.toString()
  const names = [begin, end].flatMap(part => {
    const g = part.getChild('EnvNameGroup')
    return g ? [{ from: g.from + 1, to: g.to - 1 }] : []
  })
  const nameEnd = begin.getChild('EnvNameGroup')?.to ?? begin.to
  const optional = group(text, nameEnd, '[', ']')
  const title =
    optional && /^\s*$/.test(text.slice(nameEnd, optional.from))
      ? { text: text.slice(optional.from + 1, optional.to - 1), group: optional }
      : null
  const bodyFrom = Math.max(begin.to, title?.group.to ?? 0)

  // The label: the first one in the body
  const inside = text.slice(bodyFrom, end.from)
  const match = /\\label\s*\{([^}]*)\}/.exec(inside)
  const label = match
    ? {
        text: match[1],
        content: {
          from: bodyFrom + match.index + match[0].indexOf('{') + 1,
          to: bodyFrom + match.index + match[0].length - 1,
        },
      }
    : null

  // The body without the line breaks and indentation around it, and
  // without a label on its own first line
  let from = bodyFrom
  if (match && /^\s*$/.test(inside.slice(0, match.index))) from = bodyFrom + match.index + match[0].length
  const raw = text.slice(from, end.from)
  const lead = raw.length - raw.trimStart().length
  const trail = raw.length - raw.trimEnd().length
  const content = raw.trim()
    ? { from: from + lead, to: end.from - trail }
    : { from: from + lead, to: from + lead }

  return {
    range: { from: node.from, to: node.to },
    type: getEnvironmentName(node, state) ?? 'theorem',
    names,
    title,
    titleAt: nameEnd,
    body: { text: text.slice(content.from, content.to), content },
    label,
    referenced: isReferenced(state, label?.text),
  }
}

const userEvent = 'input.sumitex-theorem'

export const setType = (model: TheoremModel, type: string): Edit =>
  type === model.type
    ? {}
    : { changes: model.names.map(span => ({ ...span, insert: type })), userEvent }

export function setTitle(model: TheoremModel, text: string): Edit {
  if (model.title) {
    return {
      changes: text
        ? { from: model.title.group.from + 1, to: model.title.group.to - 1, insert: text }
        : { ...model.title.group, insert: '' },
      userEvent,
    }
  }
  return text ? { changes: { from: model.titleAt, insert: `[${text}]` }, userEvent } : {}
}

export const setBody = (model: TheoremModel, text: string): Edit => ({
  changes: { ...model.body.content, insert: text },
  userEvent,
})

export function setLabel(model: TheoremModel, raw: string): Edit {
  const text = cleanLabel(raw)
  if (model.label) return { changes: { ...model.label.content, insert: text }, userEvent }
  if (!text) return {}
  // Right after \begin{theorem}[name]
  return {
    changes: { from: model.title?.group.to ?? model.titleAt, insert: `\\label{${text}}` },
    userEvent,
  }
}

/** The \newtheorem line a type still needs, given what is defined */
export function missingDefinition(type: string, defined: Set<string> | null) {
  const found = THEOREM_TYPES.find(t => t.name === type)
  if (!found?.preamble || !defined) return null
  return defined.has(`env:${type}`) ? null : found.preamble
}
