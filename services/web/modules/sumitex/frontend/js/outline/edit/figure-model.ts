/**
 * The figure edit pop-up's model: a figure read from the LaTeX, and each
 * action as one edit to it (like table-model.ts).
 *
 * - figure, figure*, wrapfigure; and a bare drawing (tikzpicture, a
 *   pgfplots axis), which is wrapped in a figure when it gets a caption.
 * - Every \includegraphics in it, sub-figures' too, with its width.
 * - Caption and label (below the picture, as figures have them),
 *   placement ([htbp] in plain words) and \centering.
 */
import type { ChangeSpec, EditorState } from '@codemirror/state'
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

const FIGURES = new Set(['figure', 'figure*', 'wrapfigure'])
const DRAWINGS = new Set(['tikzpicture', 'axis', 'tikzcd'])

export type FigureImage = {
  /** \includegraphics through its {path} */
  command: Span
  /** The [options] group with its brackets, or null */
  options: Span | null
  path: Text
  /** The width as written: 0.5\linewidth, 5cm…, or null */
  width: string | null
  /** In a sub-figure */
  sub: boolean
}

export type FigureModel = {
  range: Span
  /** figure, figure*, wrapfigure; null for a bare drawing */
  name: string | null
  /** The [htbp] group with its brackets, or null; where a new one goes */
  placement: Span | null
  placementAt: number
  /** The \centering line, if any */
  centering: Span | null
  /** Where the body starts: right after \begin{figure}[…] */
  bodyAt: number
  /** Where \end{figure} starts */
  endAt: number
  images: FigureImage[]
  /** A drawing in it (tikzpicture…) */
  drawing: string | null
  caption: Text | null
  label: Text | null
  referenced: boolean
}

const tree = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)

function around(state: EditorState, pos: number) {
  let figure: SyntaxNode | null = null
  let drawing: SyntaxNode | null = null
  for (
    let node: SyntaxNode | null = tree(state).resolveInner(pos, 1);
    node;
    node = node.parent
  ) {
    if (!node.type.is('$Environment')) continue
    const name = getEnvironmentName(node, state) ?? ''
    if (FIGURES.has(name)) figure = node
    else if (!drawing && DRAWINGS.has(name)) drawing = node
  }
  return { figure, drawing }
}

/** The figure (or bare drawing) at `pos`, or null */
export function readFigure(state: EditorState, pos: number): FigureModel | null {
  const found = around(state, pos)
  const node = found.figure ?? found.drawing
  if (!node) return null
  const text = state.doc.toString()
  const begin = node.getChild('BeginEnv')
  const end = node.getChild('EndEnv')
  if (!begin || !end) return null
  const name = found.figure ? getEnvironmentName(node, state) : null
  const nameEnd = begin.getChild('EnvNameGroup')?.to ?? begin.to

  let placement: Span | null = null
  if (name === 'figure' || name === 'figure*') {
    const optional = group(text, nameEnd, '[', ']')
    if (optional && /^\s*$/.test(text.slice(nameEnd, optional.from))) placement = optional
  }

  const images: FigureImage[] = []
  let drawing: string | null = found.figure ? null : getEnvironmentName(node, state)
  let centering: Span | null = null
  node.cursor().iterate(child => {
    if (child.type.is('$Environment') && child.from !== node.from) {
      const inner = getEnvironmentName(child.node, state) ?? ''
      if (!drawing && DRAWINGS.has(inner)) drawing = inner
    }
    if (child.type.is('IncludeGraphics')) {
      const at = child.from
      const ctrl = /^\\includegraphics\*?/.exec(text.slice(at))
      if (!ctrl) return
      let i = at + ctrl[0].length
      const options = group(text, i, '[', ']')
      if (options && /^\s*$/.test(text.slice(i, options.from))) i = options.to
      const path = group(text, i)
      if (!path) return
      const optionList = options
        ? readOptions(state, { from: options.from + 1, to: options.to - 1 })
        : []
      // Inside a subfigure (or a minipage) of this figure
      let sub = false
      for (let up = child.node.parent; up && up !== node; up = up.parent) {
        if (up.type.is('$Environment')) sub = true
      }
      images.push({
        command: { from: at, to: path.to },
        options: options && options.to <= path.from ? options : null,
        path: {
          text: text.slice(path.from + 1, path.to - 1),
          content: { from: path.from + 1, to: path.to - 1 },
        },
        width: optionList.find(option => option.key === 'width')?.value ?? null,
        sub,
      })
      return false
    }
  })
  const line = /\\centering(?![A-Za-z])[ \t]*\n?/.exec(text.slice(begin.to, end.from))
  if (line && found.figure) {
    centering = { from: begin.to + line.index, to: begin.to + line.index + line[0].length }
  }

  const { caption, label } = captionAndLabel(state, found.figure)
  return {
    range: { from: node.from, to: node.to },
    name,
    placement,
    placementAt: nameEnd,
    centering,
    bodyAt: placement?.to ?? begin.to,
    endAt: end.from,
    images,
    drawing,
    caption,
    label,
    referenced: isReferenced(state, label?.text),
  }
}

const userEvent = 'input.sumitex-figure'

/** A new image path, written in the style of the old one (no extension) */
export function imagePath(old: string, chosen: string) {
  return /\.[A-Za-z0-9]+$/.test(old) ? chosen : chosen.replace(/\.(png|jpe?g|pdf|eps|svg)$/i, '')
}

export function setImage(model: FigureModel, index: number, path: string): Edit {
  const image = model.images[index]
  if (!image) return { error: 'That image isn’t there any more.' }
  return {
    changes: { ...image.path.content, insert: imagePath(image.path.text, path) },
    userEvent,
  }
}

/** A width for \includegraphics: 0.5 → 0.5\linewidth, 1 → \linewidth */
export const widthValue = (fraction: string) =>
  fraction === '1' ? '\\linewidth' : `${fraction}\\linewidth`

/** The fraction of the line a width is, when it is one (0.5\linewidth) */
export function widthFraction(width: string | null) {
  if (!width) return null
  const match = /^\s*([0-9.]*)\s*\\(?:line|text|column)width\s*$/.exec(width)
  return match ? (match[1] === '' ? '1' : match[1]) : null
}

export function setWidth(state: EditorState, model: FigureModel, index: number, width: string): Edit {
  const image = model.images[index]
  if (!image) return { error: 'That image isn’t there any more.' }
  const ctrl = /^\\includegraphics\*?/.exec(state.sliceDoc(image.command.from, image.command.to))!
  return {
    changes: setOption(state, image.options, image.command.from + ctrl[0].length, 'width', width || null),
    userEvent,
  }
}

/** What placement letters say, in plain words */
export const PLACEMENTS: { value: string; label: string; title: string }[] = [
  { value: 'htbp', label: 'Best place', title: 'LaTeX puts it where it fits best: here, top, bottom or a page of its own' },
  { value: '!ht', label: 'Here', title: 'Here if it fits, else at the top of a page' },
  { value: 't', label: 'Top', title: 'At the top of a page' },
  { value: 'b', label: 'Bottom', title: 'At the bottom of a page' },
  { value: 'p', label: 'Own page', title: 'On a page of figures' },
]

export function placementOf(state: EditorState, model: FigureModel) {
  return model.placement ? state.sliceDoc(model.placement.from + 1, model.placement.to - 1) : ''
}

export function setPlacement(model: FigureModel, value: string): Edit {
  if (!model.name || model.name === 'wrapfigure') return {}
  const insert = value ? `[${value}]` : ''
  return {
    changes: model.placement
      ? { ...model.placement, insert }
      : { from: model.placementAt, insert },
    userEvent,
  }
}

export function setCentering(state: EditorState, model: FigureModel, on: boolean): Edit {
  if (!model.name || on === Boolean(model.centering)) return {}
  if (model.centering) return { changes: { ...model.centering, insert: '' }, userEvent }
  const indent = indentOf(state, model.range.from)
  return { changes: { from: model.bodyAt, insert: `\n${indent}  \\centering` }, userEvent }
}

/** A bare drawing wrapped in a figure, with these lines under it */
function wrap(state: EditorState, model: FigureModel, lines: string[]): Edit {
  const first = state.doc.lineAt(model.range.from)
  const last = state.doc.lineAt(model.range.to)
  const indent = indentOf(state, model.range.from)
  const changes: ChangeSpec[] = [
    { from: first.from, insert: `${indent}\\begin{figure}[htbp]\n${indent}  \\centering\n` },
    {
      from: last.to,
      insert: `\n${lines.map(line => `${indent}  ${line}`).join('\n')}\n${indent}\\end{figure}`,
    },
  ]
  return { changes, userEvent }
}

/** A line of its own just before \end{figure} */
function lineAtEnd(state: EditorState, model: FigureModel, text: string): Edit {
  const line = state.doc.lineAt(model.endAt)
  const before = state.sliceDoc(line.from, model.endAt).trim() === ''
  const indent = indentOf(state, model.range.from)
  return {
    changes: before
      ? { from: line.from, insert: `${indent}  ${text}\n` }
      : { from: model.endAt, insert: `\n${indent}  ${text}\n${indent}` },
    userEvent,
  }
}

export function setCaption(state: EditorState, model: FigureModel, text: string): Edit {
  if (model.caption) return { changes: { ...model.caption.content, insert: text }, userEvent }
  if (!text) return {}
  if (!model.name) return wrap(state, model, [`\\caption{${text}}`])
  // Figures take their caption below the picture, the label right after
  if (model.label) {
    const line = state.doc.lineAt(model.label.content.from)
    return { changes: { from: line.from, insert: `${indentOf(state, line.from)}\\caption{${text}}\n` }, userEvent }
  }
  return lineAtEnd(state, model, `\\caption{${text}}`)
}

export function setLabel(state: EditorState, model: FigureModel, raw: string): Edit {
  const text = cleanLabel(raw)
  if (model.label) return { changes: { ...model.label.content, insert: text }, userEvent }
  if (!text) return {}
  if (!model.name) return wrap(state, model, [`\\label{${text}}`])
  if (model.caption) return { changes: { from: model.caption.content.to + 1, insert: `\\label{${text}}` }, userEvent }
  return lineAtEnd(state, model, `\\label{${text}}`)
}
