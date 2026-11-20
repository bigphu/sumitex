/**
 * The equation edit pop-up's model (mockup frame 16): a displayed
 * equation read from the LaTeX, and each action as one edit to it (like
 * table-model.ts).
 *
 * - equation, align, gather, multline, flalign (starred or not), and \[ \]
 *   (an unnumbered equation).
 * - The source is what is between \begin and \end, without a \label at its
 *   start or end; the label has its own box.
 * - Numbered adds or removes the * (\[ \] becomes an equation); giving \[ \]
 *   a label makes it a numbered equation, as a label needs a number.
 */
import type { EditorState } from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { getEnvironmentName } from '@/features/source-editor/utils/tree-operations/environments'
import { cleanLabel, type Edit } from './table-model'

type Span = { from: number; to: number }

export const EQUATION_KINDS = [
  'equation',
  'align',
  'gather',
  'multline',
  'flalign',
] as const
export type EquationKind = (typeof EQUATION_KINDS)[number]

export type EquationModel = {
  range: Span
  /** equation, align…; for \[ \] 'equation' */
  kind: string
  numbered: boolean
  /** Written \[ … \] */
  bracket: boolean
  /** Where the names sit ({equation*} in \begin and \end), or \[ and \] */
  names: Span[]
  /** Where a new \label goes: right after \begin{…} */
  labelAt: number
  source: { text: string; span: Span }
  label: { text: string; content: Span } | null
  /** Whether \ref, \eqref, \cref… in this file name the label */
  referenced: boolean
}

const tree = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)

const KINDS = new Set<string>(EQUATION_KINDS)
const baseOf = (name: string) => name.replace(/\*$/, '')

/** The labels \ref and friends name in a text */
export function referencedLabels(text: string) {
  const names = new Set<string>()
  for (const match of text.matchAll(/\\[a-zA-Z]*ref\*?\s*\{([^}]*)\}/g)) {
    for (const name of match[1].split(',')) names.add(name.trim())
  }
  return names
}

function mathAround(state: EditorState, pos: number) {
  for (
    let node: SyntaxNode | null = tree(state).resolveInner(pos, 1);
    node;
    node = node.parent
  ) {
    if (node.type.is('BracketMath')) return { node, bracket: true }
    if (node.type.is('$Environment')) {
      const name = getEnvironmentName(node, state) ?? ''
      if (KINDS.has(baseOf(name))) return { node, bracket: false, name }
    }
  }
  return null
}

/** The displayed equation at `pos`, or null */
export function readEquation(state: EditorState, pos: number): EquationModel | null {
  const found = mathAround(state, pos)
  if (!found) return null
  const { node, bracket } = found
  let body: Span
  let names: Span[]
  let labelAt: number
  if (bracket) {
    const open = node.getChild('OpenBracketMath')
    const close = node.getChild('CloseBracketMath')
    if (!open || !close) return null
    body = { from: open.to, to: close.from }
    names = [
      { from: open.from, to: open.to },
      { from: close.from, to: close.to },
    ]
    labelAt = open.to
  } else {
    const begin = node.getChild('BeginEnv')
    const end = node.getChild('EndEnv')
    if (!begin || !end) return null
    body = { from: begin.to, to: end.from }
    names = [begin, end].flatMap(part => {
      const group = part.getChild('EnvNameGroup')
      return group ? [{ from: group.from + 1, to: group.to - 1 }] : []
    })
    labelAt = begin.to
  }

  // The first \label in the equation, not in a nested group
  const text = state.sliceDoc(body.from, body.to)
  const match = /\\label\s*\{([^}]*)\}/.exec(text)
  let label: EquationModel['label'] = null
  let source: Span = body
  if (match) {
    const from = body.from + match.index
    const to = from + match[0].length
    const open = match[0].indexOf('{')
    label = {
      text: match[1],
      content: { from: from + open + 1, to: to - 1 },
    }
    // Leave the label out of the source when it sits at either end
    if (/^\s*$/.test(state.sliceDoc(body.from, from))) source = { from: to, to: body.to }
    else if (/^\s*$/.test(state.sliceDoc(to, body.to))) source = { from: body.from, to: from }
  }
  // Without the spaces and line breaks around it
  const raw = state.sliceDoc(source.from, source.to)
  const lead = raw.length - raw.trimStart().length
  const trail = raw.length - raw.trimEnd().length
  const span =
    raw.trim() === ''
      ? { from: source.from + lead, to: source.from + lead }
      : { from: source.from + lead, to: source.to - trail }

  const name = found.name ?? 'equation*'
  return {
    range: { from: node.from, to: node.to },
    kind: bracket ? 'equation' : baseOf(name),
    numbered: !bracket && !name.endsWith('*'),
    bracket,
    names,
    labelAt,
    source: { text: state.sliceDoc(span.from, span.to), span },
    label,
    referenced: label ? referencedLabels(state.doc.toString()).has(label.text) : false,
  }
}

export const setSource = (model: EquationModel, text: string): Edit => ({
  changes: { from: model.source.span.from, to: model.source.span.to, insert: text },
  userEvent: 'input.sumitex-equation',
})

/** Rename the environment; \[ \] becomes \begin{…*} \end{…*} */
function rename(model: EquationModel, kind: string, numbered: boolean): Edit {
  const name = `${kind}${numbered ? '' : '*'}`
  if (model.bracket) {
    return {
      changes: [
        { ...model.names[0], insert: `\\begin{${name}}` },
        { ...model.names[1], insert: `\\end{${name}}` },
      ],
      userEvent: 'input.sumitex-equation',
    }
  }
  return {
    changes: model.names.map(span => ({ ...span, insert: name })),
    userEvent: 'input.sumitex-equation',
  }
}

export const setKind = (model: EquationModel, kind: EquationKind): Edit =>
  kind === model.kind && !model.bracket ? {} : rename(model, kind, model.numbered)

export const setNumbered = (model: EquationModel, numbered: boolean): Edit =>
  numbered === model.numbered ? {} : rename(model, model.kind, numbered)

export function setLabel(model: EquationModel, raw: string): Edit {
  const text = cleanLabel(raw)
  if (model.label) {
    return {
      changes: { ...model.label.content, insert: text },
      userEvent: 'input.sumitex-equation',
    }
  }
  if (!text) return {}
  const label = { from: model.labelAt, insert: `\\label{${text}}` }
  // A label needs a number: \[ \] becomes a numbered equation with it
  if (model.bracket) {
    return {
      changes: [
        { ...model.names[0], insert: `\\begin{equation}\\label{${text}}` },
        { ...model.names[1], insert: '\\end{equation}' },
      ],
      userEvent: 'input.sumitex-equation',
    }
  }
  return { changes: label, userEvent: 'input.sumitex-equation' }
}
