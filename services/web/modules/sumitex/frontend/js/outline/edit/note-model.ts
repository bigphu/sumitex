/**
 * The note edit pop-up's model: a \todo{…} or a tcolorbox, read from the
 * LaTeX, and each action as one edit (like table-model.ts).
 *
 * - \todo: its text; Done removes it.
 * - tcolorbox: its title (title=… in its options) and its text.
 */
import type { EditorState } from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { getEnvironmentName } from '@/features/source-editor/utils/tree-operations/environments'
import type { Edit } from './table-model'
import { group, readOptions, setOption, type Span, type Text } from './parts'

export type NoteModel =
  | { kind: 'todo'; range: Span; text: Text }
  | {
      kind: 'box'
      range: Span
      options: Span | null
      optionsAt: number
      title: string
      body: Text
    }

const tree = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)

/** The \todo covering `pos`, else the first on its line */
function todoAt(state: EditorState, pos: number): NoteModel | null {
  const line = state.doc.lineAt(pos)
  const text = state.doc.toString()
  const found: NoteModel[] = []
  for (const match of line.text.matchAll(/\\todo(?![A-Za-z])/g)) {
    const from = line.from + match.index!
    let at = from + match[0].length
    const options = group(text, at, '[', ']')
    if (options && /^\s*$/.test(text.slice(at, options.from))) at = options.to
    const body = group(text, at)
    if (!body) continue
    const content = { from: body.from + 1, to: body.to - 1 }
    found.push({
      kind: 'todo',
      range: { from, to: body.to },
      text: { text: text.slice(content.from, content.to), content },
    })
  }
  return found.find(note => pos >= note.range.from && pos <= note.range.to) ?? found[0] ?? null
}

export function readNote(state: EditorState, pos: number): NoteModel | null {
  let box: SyntaxNode | null = null
  for (
    let node: SyntaxNode | null = tree(state).resolveInner(pos, 1);
    node;
    node = node.parent
  ) {
    if (node.type.is('$Environment') && getEnvironmentName(node, state) === 'tcolorbox') {
      box = node
      break
    }
  }
  const todo = todoAt(state, pos)
  // The innermost: a \todo inside a box wins
  if (todo && (!box || todo.range.from > box.from)) return todo
  if (!box) return null
  const begin = box.getChild('BeginEnv')
  const end = box.getChild('EndEnv')
  if (!begin || !end) return null
  const text = state.doc.toString()
  const nameEnd = begin.getChild('EnvNameGroup')?.to ?? begin.to
  const optional = group(text, nameEnd, '[', ']')
  const options = optional && /^\s*$/.test(text.slice(nameEnd, optional.from)) ? optional : null
  const title = options
    ? (readOptions(state, { from: options.from + 1, to: options.to - 1 }).find(o => o.key === 'title')?.value ?? '')
    : ''
  const from = options?.to ?? begin.to
  const raw = text.slice(from, end.from)
  const lead = raw.length - raw.trimStart().length
  const trail = raw.length - raw.trimEnd().length
  const content = raw.trim()
    ? { from: from + lead, to: end.from - trail }
    : { from: from + lead, to: from + lead }
  return {
    kind: 'box',
    range: { from: box.from, to: box.to },
    options,
    optionsAt: nameEnd,
    title,
    body: { text: text.slice(content.from, content.to), content },
  }
}

const userEvent = 'input.sumitex-note'

export function setNoteText(model: NoteModel, text: string): Edit {
  const target = model.kind === 'todo' ? model.text : model.body
  return { changes: { ...target.content, insert: text }, userEvent }
}

export function setBoxTitle(state: EditorState, model: NoteModel, title: string): Edit {
  if (model.kind !== 'box') return {}
  return { changes: setOption(state, model.options, model.optionsAt, 'title', title || null), userEvent }
}

/** Done: the \todo goes, with a space before it if it leaves two */
export function removeTodo(state: EditorState, model: NoteModel): Edit {
  if (model.kind !== 'todo') return {}
  let { from, to } = model.range
  const line = state.doc.lineAt(from)
  if (state.sliceDoc(line.from, from).trim() === '' && state.sliceDoc(to, line.to).trim() === '') {
    // On a line of its own: the line goes
    from = line.from
    to = Math.min(line.to + 1, state.doc.length)
  } else if (state.sliceDoc(from - 1, from) === ' ' && /^[ .,;:]/.test(state.sliceDoc(to, to + 1))) {
    from -= 1
  }
  return { changes: { from, to, insert: '' }, userEvent: 'delete.sumitex-note' }
}
