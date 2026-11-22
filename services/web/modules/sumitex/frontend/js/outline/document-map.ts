/**
 * The whole document's headings, in reading order, for the Outline: from
 * the main file, following \input, \include, \subfile, \import and
 * \subimport into the files they pull in.
 *
 * The open file is the Outline's live part (blocks, editing, the cursor's
 * row), so the map leaves it out and says where it goes: the headings
 * before it, the headings after it, and the files it pulls in itself (by
 * the line that pulls them in), which the Outline places inside its part.
 *
 * Pure: the texts come from the project snapshot (preamble-store.ts).
 */

export type MappedHeading = {
  /** Project path of the file the heading is in */
  path: string
  /** 1-based line in that file */
  line: number
  /** part 2, chapter 3, section 4, … (the editor outline's levels) */
  level: number
  /** The title as written, LaTeX and all */
  title: string
}

export type IncludeInCurrent = {
  /** The line in the open file that pulls the file in */
  line: number
  /** What it pulls in, its own includes followed */
  headings: MappedHeading[]
}

export type DocumentMap = {
  /**
   * The open file is part of the main document (or is the main file). When
   * it isn't, `before` holds the whole document and `after` is empty.
   */
  inDocument: boolean
  before: MappedHeading[]
  after: MappedHeading[]
  includesInCurrent: IncludeInCurrent[]
  /**
   * The open file's own headings as last saved, for the moment after a
   * file switch when the editor's live outline still holds the old file's
   */
  currentHeadings: MappedHeading[]
}

const LEVELS: Record<string, number> = {
  part: 2,
  chapter: 3,
  section: 4,
  subsection: 5,
  subsubsection: 6,
  paragraph: 7,
  subparagraph: 8,
}

const HEADING =
  /\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\s*(?:\[[^\]]*\]\s*)?\{/g
const INCLUDE =
  /\\(input|include|subfile)\s*\{([^}]+)\}|\\(import|subimport|inputfrom|includefrom|subinputfrom|subincludefrom)\*?\s*\{([^}]*)\}\s*\{([^}]+)\}/g

const MAX_DEPTH = 12

/** A line without its comment (an unescaped %) */
const stripComment = (line: string) => {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\') {
      i++
      continue
    }
    if (line[i] === '%') return line.slice(0, i)
  }
  return line
}

/** The braced group starting right after `open` ({ at text[open - 1]) */
const readGroup = (text: string, open: number) => {
  let depth = 1
  for (let i = open; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\\') {
      i++
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return text.slice(open, i)
  }
  return null // not closed on this line
}

const dirOf = (path: string) =>
  path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : ''

/** a/b/../c/./d → a/c/d */
const normalize = (path: string) => {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return out.join('/')
}

type Step =
  | { kind: 'heading'; line: number; level: number; title: string }
  | { kind: 'include'; line: number; candidates: string[] }

/** One file's headings and include lines, in order */
export function scanFile(
  text: string,
  path: string,
  mainDir: string
): Step[] {
  const steps: Step[] = []
  const lines = text.split('\n')
  lines.forEach((raw, index) => {
    const line = stripComment(raw)
    if (!line.includes('\\')) return
    const found: (Step & { at: number })[] = []
    for (const match of line.matchAll(HEADING)) {
      const title = readGroup(line, match.index! + match[0].length)
      if (title === null) continue
      found.push({
        kind: 'heading',
        at: match.index!,
        line: index + 1,
        level: LEVELS[match[1]],
        title: title.trim(),
      })
    }
    for (const match of line.matchAll(INCLUDE)) {
      const candidates: string[] = []
      const add = (dir: string, name: string) => {
        const base = normalize(dir + name.trim())
        if (!base) return
        candidates.push(/\.[a-z]+$/i.test(base) ? base : `${base}.tex`)
        if (/\.[a-z]+$/i.test(base)) candidates.push(`${base}.tex`)
      }
      if (match[1]) {
        // \input and friends: from the main file's folder, as LaTeX runs
        // there; then from this file's folder, as people often write them
        add(mainDir, match[2])
        add(dirOf(path), match[2])
      } else {
        // \import{dir}{file}: dir from the main folder (\import) or from
        // this file's folder (\subimport and the *from variants)
        const relative = match[3].startsWith('sub')
        const dir = match[4].trim()
        const withSlash = dir && !dir.endsWith('/') ? `${dir}/` : dir
        add((relative ? dirOf(path) : '') + withSlash, match[5])
        add(dirOf(path) + withSlash, match[5])
      }
      found.push({ kind: 'include', at: match.index!, line: index + 1, candidates })
    }
    found.sort((a, b) => a.at - b.at)
    for (const { at: _at, ...step } of found) steps.push(step)
  })
  return steps
}

export function mapDocument(
  docs: Map<string, string>,
  mainPath: string | null,
  currentPath: string | null
): DocumentMap {
  const mainDir = mainPath ? dirOf(mainPath) : ''
  const resolve = (candidates: string[]) =>
    candidates.find(candidate => docs.has(candidate)) ?? null
  const scans = new Map<string, Step[]>()
  const scan = (path: string) => {
    let steps = scans.get(path)
    if (!steps) {
      steps = scanFile(docs.get(path) ?? '', path, mainDir)
      scans.set(path, steps)
    }
    return steps
  }

  /** Every heading in `path`, its includes followed (the open file's too) */
  const flatten = (
    path: string,
    seen: Set<string>,
    out: MappedHeading[],
    depth = 0
  ) => {
    if (depth > MAX_DEPTH || seen.has(path)) return
    seen.add(path)
    for (const step of scan(path)) {
      if (step.kind === 'heading') {
        out.push({ path, line: step.line, level: step.level, title: step.title })
      } else {
        const target = resolve(step.candidates)
        if (target) flatten(target, seen, out, depth + 1)
      }
    }
    seen.delete(path)
  }

  // The files the open file pulls in, wherever it sits, and its own headings
  const includesInCurrent: IncludeInCurrent[] = []
  const currentHeadings: MappedHeading[] = []
  if (currentPath && docs.has(currentPath)) {
    for (const step of scan(currentPath)) {
      if (step.kind === 'heading') {
        currentHeadings.push({
          path: currentPath,
          line: step.line,
          level: step.level,
          title: step.title,
        })
        continue
      }
      const target = resolve(step.candidates)
      if (!target) continue
      const headings: MappedHeading[] = []
      flatten(target, new Set([currentPath]), headings)
      if (headings.length) includesInCurrent.push({ line: step.line, headings })
    }
  }

  // The main document around the open file
  const before: MappedHeading[] = []
  const after: MappedHeading[] = []
  let reached = false
  const walk = (path: string, seen: Set<string>, depth = 0) => {
    if (depth > MAX_DEPTH || seen.has(path)) return
    if (path === currentPath) {
      // Its own headings and includes are the Outline's live part
      reached = true
      return
    }
    seen.add(path)
    for (const step of scan(path)) {
      if (step.kind === 'heading') {
        ;(reached ? after : before).push({
          path,
          line: step.line,
          level: step.level,
          title: step.title,
        })
      } else {
        const target = resolve(step.candidates)
        if (target) walk(target, seen, depth + 1)
      }
    }
    seen.delete(path)
  }
  if (mainPath && docs.has(mainPath)) walk(mainPath, new Set())

  if (!reached) {
    // Not part of the main document (or no main file): its own part only.
    // `before` then holds the whole document, for when the open file has no
    // outline of its own (an image, a PDF): the Outline can still show it.
    return { inDocument: false, before, after: [], includesInCurrent, currentHeadings }
  }
  return { inDocument: true, before, after, includesInCurrent, currentHeadings }
}
