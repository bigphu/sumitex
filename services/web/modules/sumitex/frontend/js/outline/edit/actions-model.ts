/**
 * The Outline's ⋯ actions, as edits (outline/edit/block-actions.ts runs
 * them): a reference to a block, a copy of it, deleting it, and for a
 * section: one level up or down (the sections inside follow), or a place
 * up or down among its neighbours.
 */
import type { EditorState, TransactionSpec } from '@codemirror/state'
import { labelsIn } from '../../editor/image-paste-text'
import type { Span } from './parts'

export type Edit = TransactionSpec | { error: string }

/** The whole lines a block takes */
export function blockLines(state: EditorState, range: Span): Span {
  const first = state.doc.lineAt(range.from)
  const last = state.doc.lineAt(Math.max(range.from, range.to - 1))
  return { from: first.from, to: last.to }
}

const REF_NAMES: Record<string, string> = {
  figure: 'Figure',
  table: 'Table',
  section: 'Section',
  chapter: 'Chapter',
  subsection: 'Section',
  subsubsection: 'Section',
  code: 'Listing',
  algorithm: 'Algorithm',
  graph: 'Figure',
}

/**
 * How the text refers to a block: \cref{…} with cleveref loaded, else
 * the kind's name and \ref (Figure~\ref{…}); equations as \eqref{…}
 * (amsmath) or (\ref{…})
 */
export function referenceText(
  kind: string,
  label: string,
  loaded: ReadonlySet<string>
) {
  if (kind === 'equation') {
    return loaded.has('amsmath') || loaded.has('mathtools')
      ? `\\eqref{${label}}`
      : `(\\ref{${label}})`
  }
  if (loaded.has('cleveref')) return `\\cref{${label}}`
  const name =
    REF_NAMES[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1).replace(/\*$/, '')
  return `${name}~\\ref{${label}}`
}

/**
 * A copy of the block right after it, a blank line between; its labels
 * get a number so no label is defined twice
 */
export function duplicateBlock(state: EditorState, range: Span): Edit {
  const lines = blockLines(state, range)
  const taken = labelsIn(state.doc.toString())
  const text = state.sliceDoc(lines.from, lines.to).replace(/\\label\s*\{([^}]*)\}/g, (_, name: string) => {
    let n = 2
    while (taken.has(`${name}-${n}`)) n++
    taken.add(`${name}-${n}`)
    return `\\label{${name}-${n}}`
  })
  return {
    changes: { from: lines.to, insert: `\n\n${text}` },
    selection: { anchor: lines.to + 2 },
    scrollIntoView: true,
    userEvent: 'input.sumitex-duplicate',
  }
}

/** The block's lines go, with one blank line next to them */
export function deleteBlock(state: EditorState, range: Span): Edit {
  const lines = blockLines(state, range)
  let { from, to } = lines
  const doc = state.doc
  const after = doc.lineAt(Math.min(to + 1, doc.length))
  const before = from > 0 ? doc.lineAt(from - 1) : null
  if (to < doc.length && after.text.trim() === '' && after.number > doc.lineAt(to).number) {
    to = Math.min(after.to + 1, doc.length)
  } else if (before && before.text.trim() === '') {
    from = before.from
  } else if (to < doc.length) {
    to += 1
  }
  return {
    changes: { from, to, insert: '' },
    selection: { anchor: from },
    scrollIntoView: true,
    userEvent: 'delete.sumitex-block',
  }
}

/**
 * Swap two neighbouring sections (each with what it holds); `first` comes
 * right before `second` in the text
 */
export function swapSections(state: EditorState, first: Span, second: Span): Edit {
  let a = state.sliceDoc(second.from, second.to)
  let b = state.sliceDoc(first.from, first.to)
  // The one that goes first must end its last line
  if (!a.endsWith('\n')) {
    a += '\n'
    b = b.replace(/\n$/, '')
  }
  return {
    changes: { from: first.from, to: second.to, insert: a + b },
    selection: { anchor: first.from },
    scrollIntoView: true,
    userEvent: 'move.sumitex-section',
  }
}
