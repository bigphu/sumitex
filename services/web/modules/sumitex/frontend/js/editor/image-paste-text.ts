/**
 * The text side of pasting or dropping an image (editor/image-paste.ts):
 * the file's name in the project, the figure's label, the figure itself,
 * and where it goes. No DOM here, so all of it is unit-tested.
 */
import type { EditorState } from '@codemirror/state'

/** Where pasted and dropped images go, from the project's root */
export const IMAGE_FOLDER = 'images'

/** What the caption says until it is typed over (and selected for that) */
export const CAPTION_PLACEHOLDER = 'Caption'

/** The width a new figure gets, as the \fig snippet */
export const DEFAULT_WIDTH = '0.8'

/**
 * A file name LaTeX takes without fuss: lower case, ASCII letters, digits
 * and dashes ("Kết quả 2.PNG" → "ket-qua-2"); "image" when nothing's left
 */
export function safeStem(name: string) {
  const stem = name.replace(/\.[^.]*$/, '')
  const safe = stem
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return safe || 'image'
}

/**
 * A name nothing in the folder has yet. Pasted images are numbered from 1
 * (pasted-1.png); a dropped file keeps its name, numbered from 2 only when
 * it is taken (chart.png, chart-2.png).
 */
export function uniqueName(
  stem: string,
  extension: string,
  taken: ReadonlySet<string>,
  numbered = false
) {
  const free = (name: string) => !taken.has(name.toLowerCase())
  if (!numbered && free(`${stem}.${extension}`)) return `${stem}.${extension}`
  for (let n = numbered ? 1 : 2; ; n++) {
    const name = `${stem}-${n}.${extension}`
    if (free(name)) return name
  }
}

/** The labels already in a document */
export const labelsIn = (text: string) =>
  new Set([...text.matchAll(/\\label\s*\{([^}]*)\}/g)].map(match => match[1]))

/** fig:<stem>, numbered when this file already has it */
export function figureLabel(stem: string, taken: ReadonlySet<string>) {
  if (!taken.has(`fig:${stem}`)) return `fig:${stem}`
  for (let n = 2; ; n++) {
    if (!taken.has(`fig:${stem}-${n}`)) return `fig:${stem}-${n}`
  }
}

/** The figure, as the \fig snippet writes it */
export const figureBlock = (path: string, label: string) =>
  [
    '\\begin{figure}[htbp]',
    '  \\centering',
    `  \\includegraphics[width=${DEFAULT_WIDTH}\\linewidth]{${path}}`,
    `  \\caption{${CAPTION_PLACEHOLDER}}`,
    `  \\label{${label}}`,
    '\\end{figure}',
  ].join('\n')

/**
 * Where figures go for a paste or drop at `pos`, so that each is a block
 * of its own with a blank line on either side:
 * - on an empty line: in that line
 * - on a line with text: after that line (a figure never splits a line)
 * Returns the change; `start` is where the first figure's text begins.
 */
export function placeFigures(
  state: EditorState,
  pos: number,
  blocks: string[]
): { from: number; to: number; insert: string; start: number } {
  const doc = state.doc
  const line = doc.lineAt(pos)
  const body = blocks.join('\n\n')
  const blank = (n: number) =>
    n >= 1 && n <= doc.lines && doc.line(n).text.trim() === ''
  const exists = (n: number) => n >= 1 && n <= doc.lines

  if (line.text.trim() === '') {
    // Blank lines around it, unless there is one there already (or the
    // start or end of the file)
    const before = exists(line.number - 1) && !blank(line.number - 1) ? '\n' : ''
    const after = exists(line.number + 1) && !blank(line.number + 1) ? '\n' : ''
    return {
      from: line.from,
      to: line.to,
      insert: before + body + after,
      start: line.from + before.length,
    }
  }

  const after = exists(line.number + 1) && !blank(line.number + 1) ? '\n' : ''
  return {
    from: line.to,
    to: line.to,
    insert: '\n\n' + body + after,
    start: line.to + 2,
  }
}

/** Where the width sits in a figure's \includegraphics, and its value */
export function widthIn(text: string) {
  const match = /\\includegraphics\s*\[([^\]]*)\]/.exec(text)
  if (!match) return null
  const width = /width\s*=\s*([0-9.]*)\s*\\(?:line|text)width/.exec(match[1])
  if (!width) return null
  const from = match.index + match[0].indexOf('[') + 1 + width.index
  return {
    from,
    to: from + width[0].length,
    value: width[1] === '' ? '1' : width[1],
  }
}
