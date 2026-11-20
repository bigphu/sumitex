/**
 * The code edit pop-up's model: lstlisting, minted and algorithm, read
 * from the LaTeX, and each action as one edit (like table-model.ts).
 *
 * - lstlisting: language, caption, label and line numbers are options
 *   ([language=Python, caption=…]); the code.
 * - minted: the language is its {argument}, line numbers its linenos
 *   option; caption and label come from a listing float around it.
 * - algorithm: a float; caption and label (the steps are edited in the
 *   editor).
 */
import type { EditorState } from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { getEnvironmentName } from '@/features/source-editor/utils/tree-operations/environments'
import { cleanLabel, type Edit } from './table-model'
import {
  captionAndLabel,
  group,
  indentOf,
  isReferenced,
  readOptions,
  setOption,
  type Span,
  type Text,
} from './parts'

const CODE = new Set(['lstlisting', 'minted', 'algorithm', 'algorithm*'])
const FLOATS = new Set(['listing', 'algorithm', 'algorithm*'])

export type CodeModel = {
  range: Span
  name: string
  options: Span | null
  optionsAt: number
  language: string
  /** minted's {language} */
  languageArg: Span | null
  numbered: boolean
  code: Text | null
  caption: Text | null
  label: Text | null
  /** Where caption and label live: in the options, or in a float */
  captionIn: 'options' | 'float' | null
  /** The float (listing, algorithm) around it */
  float: Span | null
  referenced: boolean
}

const tree = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)

/** Common languages for the language box */
export const LANGUAGES = [
  'Python', 'C', 'C++', 'Java', 'JavaScript', 'TypeScript', 'R', 'Matlab',
  'Bash', 'SQL', 'HTML', 'XML', 'Go', 'Rust', 'Haskell', 'TeX',
]

export function readCode(state: EditorState, pos: number): CodeModel | null {
  let code: SyntaxNode | null = null
  let float: SyntaxNode | null = null
  for (
    let node: SyntaxNode | null = tree(state).resolveInner(pos, 1);
    node;
    node = node.parent
  ) {
    if (!node.type.is('$Environment')) continue
    const name = getEnvironmentName(node, state) ?? ''
    if (!code && CODE.has(name)) code = node
    if (FLOATS.has(name)) float = node
  }
  // On a listing float: the code in it
  if (!code && float) {
    float.cursor().iterate(node => {
      if (code) return false
      if (node.type.is('$Environment') && CODE.has(getEnvironmentName(node.node, state) ?? '')) {
        code = node.node
        return false
      }
    })
  }
  const node = code ?? float
  if (!node) return null
  const name = getEnvironmentName(node as SyntaxNode, state) ?? ''
  const begin = (node as SyntaxNode).getChild('BeginEnv')
  const end = (node as SyntaxNode).getChild('EndEnv')
  if (!begin || !end) return null
  const text = state.doc.toString()
  const nameEnd = begin.getChild('EnvNameGroup')?.to ?? begin.to
  const optional = group(text, nameEnd, '[', ']')
  const options = optional && /^\s*$/.test(text.slice(nameEnd, optional.from)) ? optional : null
  const list = options ? readOptions(state, { from: options.from + 1, to: options.to - 1 }) : []
  const value = (key: string) => list.find(o => o.key === key)

  let languageArg: Span | null = null
  let codeFrom = options?.to ?? nameEnd
  if (name === 'minted') {
    const arg = group(text, codeFrom)
    if (arg) {
      languageArg = { from: arg.from + 1, to: arg.to - 1 }
      codeFrom = arg.to
    }
  }

  const isAlgorithm = name.startsWith('algorithm')
  let code_: Text | null = null
  if (!isAlgorithm) {
    // The code: from the line after \begin to the line before \end
    const start = text.indexOf('\n', codeFrom) + 1
    const stop = text.lastIndexOf('\n', end.from - 1)
    const content = start > 0 && stop >= start ? { from: start, to: stop } : { from: codeFrom, to: end.from }
    code_ = { text: text.slice(content.from, content.to), content }
  }

  const floatNode = isAlgorithm ? (node as SyntaxNode) : float
  const fromFloat = floatNode ? captionAndLabel(state, floatNode) : { caption: null, label: null }
  const opt = (key: string): Text | null => {
    const found = value(key)
    return found?.valueSpan ? { text: found.value ?? '', content: found.valueSpan } : null
  }
  const captionIn = name === 'lstlisting' ? 'options' : floatNode ? 'float' : null
  const caption = captionIn === 'options' ? opt('caption') : fromFloat.caption
  const label = captionIn === 'options' ? opt('label') : fromFloat.label

  return {
    range: { from: (node as SyntaxNode).from, to: (node as SyntaxNode).to },
    name,
    options,
    optionsAt: nameEnd,
    language: languageArg ? text.slice(languageArg.from, languageArg.to) : (value('language')?.value ?? ''),
    languageArg,
    numbered: name === 'minted' ? Boolean(value('linenos')) : ['left', 'right'].includes(value('numbers')?.value ?? ''),
    code: code_,
    caption,
    label,
    captionIn,
    float: floatNode ? { from: floatNode.from, to: floatNode.to } : null,
    referenced: isReferenced(state, label?.text),
  }
}

const userEvent = 'input.sumitex-code'

export function setLanguage(state: EditorState, model: CodeModel, language: string): Edit {
  if (model.languageArg) return { changes: { ...model.languageArg, insert: language }, userEvent }
  if (model.name !== 'lstlisting') return {}
  return { changes: setOption(state, model.options, model.optionsAt, 'language', language || null), userEvent }
}

export function setNumbered(state: EditorState, model: CodeModel, on: boolean): Edit {
  if (model.name === 'minted') {
    return { changes: setOption(state, model.options, model.optionsAt, 'linenos', on ? '' : null), userEvent }
  }
  if (model.name !== 'lstlisting') return {}
  return { changes: setOption(state, model.options, model.optionsAt, 'numbers', on ? 'left' : null), userEvent }
}

export const setCode = (model: CodeModel, text: string): Edit =>
  model.code ? { changes: { ...model.code.content, insert: text }, userEvent } : {}

/** Caption or label: an option of lstlisting, or a line in the float */
function setFloatText(state: EditorState, model: CodeModel, key: 'caption' | 'label', text: string): Edit {
  const current = model[key]
  // An option is written again whole, so a comma gets its braces
  if (model.captionIn === 'options') {
    return { changes: setOption(state, model.options, model.optionsAt, key, text || null), userEvent }
  }
  if (current) return { changes: { ...current.content, insert: text }, userEvent }
  if (!text) return {}
  if (model.captionIn === 'float' && model.float) {
    // Algorithms and listings take theirs at the top, after \begin
    const line = state.doc.lineAt(model.float.from)
    const indent = indentOf(state, model.float.from)
    const after = key === 'label' && model.caption ? model.caption.content.to + 1 : null
    return {
      changes:
        after !== null
          ? { from: after, insert: `\\label{${text}}` }
          : { from: line.to, insert: `\n${indent}  \\${key}{${text}}` },
      userEvent,
    }
  }
  return { error: 'Put minted code in a listing float to give it a caption.' }
}

export const setCaption = (state: EditorState, model: CodeModel, text: string) =>
  setFloatText(state, model, 'caption', text)

export const setLabel = (state: EditorState, model: CodeModel, raw: string) =>
  setFloatText(state, model, 'label', cleanLabel(raw))
