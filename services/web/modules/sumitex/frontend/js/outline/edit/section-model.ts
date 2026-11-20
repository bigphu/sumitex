/**
 * The section edit pop-up's model (mockup frame 18): a sectioning command
 * read from the LaTeX, and each action as one edit to it (like
 * table-model.ts).
 *
 * - Title, label, numbered (\section or \section*).
 * - Level: chapter, section, subsection… The sub-sections inside move
 *   with it, so a section that becomes a subsection keeps its
 *   subsections one level below it.
 */
import type { EditorState } from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { referencedLabels } from './equation-model'
import { cleanLabel, type Edit } from './table-model'

type Span = { from: number; to: number }

export const LEVELS = [
  'part',
  'chapter',
  'section',
  'subsection',
  'subsubsection',
  'paragraph',
  'subparagraph',
] as const
export type Level = (typeof LEVELS)[number]

const CTRL_LEVEL: Record<string, number> = {
  PartCtrlSeq: 0,
  ChapterCtrlSeq: 1,
  SectionCtrlSeq: 2,
  SubSectionCtrlSeq: 3,
  SubSubSectionCtrlSeq: 4,
  ParagraphCtrlSeq: 5,
  SubParagraphCtrlSeq: 6,
}

type Heading = { level: number; ctrl: Span }

export type SectionModel = {
  range: Span
  level: number
  /** The command (\section) */
  ctrl: Span
  numbered: boolean
  /** Where a * goes, or the * to remove */
  star: Span
  title: { text: string; content: Span }
  label: { text: string; content: Span } | null
  /** Where a new \label goes: after the command, on a line of its own */
  labelAt: number
  indent: string
  /** The sections inside, which move with it */
  inner: Heading[]
  referenced: boolean
}

const tree = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)

/** The command of a $Section node: its control sequence and title */
function headingOf(section: SyntaxNode) {
  const command = section.firstChild
  if (!command) return null
  const ctrl = command.firstChild
  if (!ctrl || !(ctrl.type.name in CTRL_LEVEL)) return null
  return { command, ctrl, level: CTRL_LEVEL[ctrl.type.name] }
}

/** The section whose command is on the line of `pos`, or null */
export function readSection(state: EditorState, pos: number): SectionModel | null {
  const line = state.doc.lineAt(pos)
  const at = line.from + (line.text.length - line.text.trimStart().length)
  let section: SyntaxNode | null = null
  for (
    let node: SyntaxNode | null = tree(state).resolveInner(at, 1);
    node;
    node = node.parent
  ) {
    if (node.type.is('$Section')) {
      section = node
      break
    }
  }
  if (!section) return null
  const heading = headingOf(section)
  if (!heading || state.doc.lineAt(heading.ctrl.from).number !== line.number) return null
  const { command, ctrl, level } = heading

  const argument = command.getChild('SectioningArgument')
  if (!argument || argument.to - argument.from < 2) return null
  const content = { from: argument.from + 1, to: argument.to - 1 }

  // A * right after the command
  const after = state.sliceDoc(ctrl.to, argument.from)
  const starAt = after.indexOf('*')
  const star =
    starAt >= 0
      ? { from: ctrl.to + starAt, to: ctrl.to + starAt + 1 }
      : { from: ctrl.to, to: ctrl.to }

  // A \label right after the command (same line or the next ones)
  const rest = state.sliceDoc(command.to, Math.min(command.to + 300, state.doc.length))
  const match = /^\s*\\label\s*\{([^}]*)\}/.exec(rest)
  const label = match
    ? {
        text: match[1],
        content: {
          from: command.to + match[0].indexOf('{') + 1,
          to: command.to + match[0].length - 1,
        },
      }
    : null

  const inner: Heading[] = []
  section.cursor().iterate(node => {
    if (node.from === section!.from && node.to === section!.to) return
    if (node.type.is('$Section')) {
      const found = headingOf(node.node)
      if (found) inner.push({ level: found.level, ctrl: { from: found.ctrl.from, to: found.ctrl.to } })
    }
  })

  return {
    range: { from: section.from, to: section.to },
    level,
    ctrl: { from: ctrl.from, to: ctrl.to },
    numbered: starAt < 0,
    star,
    title: { text: state.sliceDoc(content.from, content.to), content },
    label,
    labelAt: command.to,
    indent: /^[ \t]*/.exec(line.text)![0],
    inner,
    referenced: label ? referencedLabels(state.doc.toString()).has(label.text) : false,
  }
}

export const setTitle = (model: SectionModel, text: string): Edit => ({
  changes: { ...model.title.content, insert: text.replace(/\n/g, ' ') },
  userEvent: 'input.sumitex-section',
})

/** Change the level; the sections inside move by the same amount */
export function setLevel(model: SectionModel, level: number): Edit {
  const delta = level - model.level
  if (delta === 0) return {}
  const all = [{ level: model.level, ctrl: model.ctrl }, ...model.inner]
  const deepest = Math.max(...all.map(heading => heading.level)) + delta
  const highest = Math.min(...all.map(heading => heading.level)) + delta
  if (deepest >= LEVELS.length) {
    return { error: `A section inside would go below \\${LEVELS[LEVELS.length - 1]}; move it out first.` }
  }
  if (highest < 0) return { error: 'That is already the highest level.' }
  return {
    changes: all.map(heading => ({
      ...heading.ctrl,
      insert: `\\${LEVELS[heading.level + delta]}`,
    })),
    userEvent: 'input.sumitex-section',
  }
}

export function setNumbered(model: SectionModel, numbered: boolean): Edit {
  if (numbered === model.numbered) return {}
  return {
    changes: { ...model.star, insert: numbered ? '' : '*' },
    userEvent: 'input.sumitex-section',
  }
}

export function setLabel(model: SectionModel, raw: string): Edit {
  const text = cleanLabel(raw)
  if (model.label) {
    return { changes: { ...model.label.content, insert: text }, userEvent: 'input.sumitex-section' }
  }
  if (!text) return {}
  return {
    changes: { from: model.labelAt, insert: `\n${model.indent}\\label{${text}}` },
    userEvent: 'input.sumitex-section',
  }
}
