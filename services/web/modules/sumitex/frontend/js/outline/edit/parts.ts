/**
 * Pieces the edit pop-ups' models share: a float's caption and label, the
 * {…} or […] group at a place, and [key=value] options (lstlisting,
 * \includegraphics, tcolorbox…).
 */
import type { ChangeSpec, EditorState } from '@codemirror/state'
import type { SyntaxNode } from '@lezer/common'

export type Span = { from: number; to: number }
export type Text = { text: string; content: Span }

/** The group opening at `at` (after spaces), with its brackets */
export function group(text: string, at: number, open = '{', close = '}'): Span | null {
  let i = at
  while (text[i] === ' ' || text[i] === '\t' || text[i] === '\n') i++
  if (text[i] !== open) return null
  let depth = 0
  for (let j = i; j < text.length; j++) {
    if (text[j] === '\\') {
      j++
      continue
    }
    if (text[j] === open) depth++
    else if (text[j] === close && --depth === 0) return { from: i, to: j + 1 }
  }
  return null
}

/** The first \caption and \label written directly in a float */
export function captionAndLabel(
  state: EditorState,
  float: SyntaxNode | null
): { caption: Text | null; label: Text | null } {
  let caption: Text | null = null
  let label: Text | null = null
  if (!float) return { caption, label }
  const inner = (node: SyntaxNode | null) =>
    node && node.to - node.from >= 2 ? { from: node.from + 1, to: node.to - 1 } : null
  float.cursor().iterate(node => {
    // Not inside another environment (a subfigure has its own)
    if (node.type.is('$Environment') && (node.from !== float.from || node.to !== float.to)) {
      return false
    }
    if (!caption && node.type.is('Caption')) {
      const content = inner(node.node.getChild('TextArgument'))
      if (content) {
        // A \label written inside the caption has its own box: leave it out
        const text = state.sliceDoc(content.from, content.to)
        const lead = /^\s*\\label\s*\{[^}]*\}\s*/.exec(text)
        const trail = /\s*\\label\s*\{[^}]*\}\s*$/.exec(text)
        const span = {
          from: content.from + (lead ? lead[0].length : 0),
          to: content.to - (trail && !lead ? trail[0].length : 0),
        }
        caption = { text: state.sliceDoc(span.from, span.to), content: span }
      }
    }
    if (!label && node.type.is('Label')) {
      const content = inner(
        node.node.getChild('LabelArgument')?.getChild('ShortTextArgument') ?? null
      )
      if (content) label = { text: state.sliceDoc(content.from, content.to), content }
    }
  })
  return { caption, label }
}

export type Option = {
  key: string
  value: string | null
  /** The whole entry, key=value */
  entry: Span
  /** The value, without braces around it */
  valueSpan: Span | null
}

/** The entries of a [key=value, …] list, `span` being inside the brackets */
export function readOptions(state: EditorState, span: Span): Option[] {
  const text = state.sliceDoc(span.from, span.to)
  const options: Option[] = []
  let depth = 0
  let start = 0
  const push = (end: number) => {
    const raw = text.slice(start, end)
    const lead = raw.length - raw.trimStart().length
    const body = raw.trim()
    if (body) {
      const from = span.from + start + lead
      const eq = body.indexOf('=')
      if (eq < 0) {
        options.push({ key: body, value: null, entry: { from, to: from + body.length }, valueSpan: null })
      } else {
        const key = body.slice(0, eq).trim()
        const rawValue = body.slice(eq + 1)
        const valueLead = rawValue.length - rawValue.trimStart().length
        let value = rawValue.trim()
        let valueFrom = from + eq + 1 + valueLead
        if (value.startsWith('{') && value.endsWith('}')) {
          value = value.slice(1, -1)
          valueFrom++
        }
        options.push({
          key,
          value,
          entry: { from, to: from + body.length },
          valueSpan: { from: valueFrom, to: valueFrom + value.length },
        })
      }
    }
    start = end + 1
  }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') i++
    else if (text[i] === '{') depth++
    else if (text[i] === '}') depth--
    else if (text[i] === ',' && depth === 0) push(i)
  }
  push(text.length)
  return options
}

/** A value as it goes in an option: in braces when it has , = or [ ] */
export const optionValue = (value: string) =>
  /[,=[\]]/.test(value) ? `{${value}}` : value

/**
 * Set (or with null, remove) one option. `brackets` is the […] group with
 * its brackets, or null when there is none yet: then a new one goes at
 * `insertAt`.
 */
export function setOption(
  state: EditorState,
  brackets: Span | null,
  insertAt: number,
  key: string,
  value: string | null
): ChangeSpec[] {
  const entry = value === null ? null : value === '' ? key : `${key}=${optionValue(value)}`
  if (!brackets) return entry ? [{ from: insertAt, insert: `[${entry}]` }] : []
  const inside = { from: brackets.from + 1, to: brackets.to - 1 }
  const options = readOptions(state, inside)
  const found = options.find(option => option.key === key)
  if (found) {
    if (entry) return [{ ...found.entry, insert: entry }]
    // Remove it with its comma; the brackets go when nothing is left
    if (options.length === 1) return [{ ...brackets, insert: '' }]
    const index = options.indexOf(found)
    const to = index < options.length - 1 ? options[index + 1].entry.from : found.entry.to
    const from = index < options.length - 1 ? found.entry.from : options[index - 1].entry.to
    return [{ from, to, insert: '' }]
  }
  if (!entry) return []
  const text = state.sliceDoc(inside.from, inside.to).trim()
  return [{ from: inside.to, insert: text ? `, ${entry}` : entry }]
}

/** Spaces at the start of the line of `pos` */
export const indentOf = (state: EditorState, pos: number) =>
  /^[ \t]*/.exec(state.doc.lineAt(pos).text)![0]

/** Whether this file refers to `label` (\ref, \eqref, \cref…) */
export function isReferenced(state: EditorState, label: string | undefined) {
  if (!label) return false
  for (const match of state.doc.toString().matchAll(/\\[a-zA-Z]*ref\*?\s*\{([^}]*)\}/g)) {
    if (match[1].split(',').some(name => name.trim() === label)) return true
  }
  return false
}
