/**
 * What the project checks need to know about the whole project, built
 * from the project snapshot (use-project-preamble.ts): every \label and
 * where it is, every citation key and its file, every file path, and
 * where \includegraphics looks for images.
 */
import { codeOnly, normalizePath } from './latex-text'

export type ProjectIndex = {
  /** \label names per .tex file */
  labelsByPath: Map<string, string[]>
  /** Citation keys per file: .bib entries and \bibitem keys */
  citeKeysByPath: Map<string, string[]>
  /** Every file in the project, docs and binary files */
  paths: Set<string>
  /** \graphicspath folders, relative to the main file's folder */
  graphicsPaths: string[]
  /** The main file's folder ("" at the top), where paths are relative to */
  mainDir: string
}

const LABEL = /\\label\s*\{([^}]+)\}/g
const BIBITEM = /\\bibitem\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g
const BIB_ENTRY = /@(\w+)\s*[{(]\s*([^,\s]+)\s*,/g

/** Labels in a .tex text, in order (repeats kept) */
export const labelsIn = (text: string) =>
  [...codeOnly(text).matchAll(LABEL)].map(match => match[1].trim())

/** Entry keys in a .bib text, in order, with their positions */
export function bibEntries(text: string) {
  return [...text.matchAll(BIB_ENTRY)]
    .filter(match => !/^(string|comment|preamble)$/i.test(match[1]))
    .map(match => ({
      key: match[2],
      at: match.index! + match[0].lastIndexOf(match[2]),
    }))
}

export function buildIndex(
  docs: Map<string, string>,
  binaryPaths: string[],
  mainPath: string | null,
  mainText: string | null
): ProjectIndex {
  const labelsByPath = new Map<string, string[]>()
  const citeKeysByPath = new Map<string, string[]>()
  for (const [path, text] of docs) {
    if (path.endsWith('.bib')) {
      citeKeysByPath.set(path, bibEntries(text).map(entry => entry.key))
    } else if (path.endsWith('.tex')) {
      labelsByPath.set(path, labelsIn(text))
      const items = [...codeOnly(text).matchAll(BIBITEM)].map(m => m[1].trim())
      if (items.length) citeKeysByPath.set(path, items)
    }
  }
  const graphicsPaths: string[] = []
  const declared = mainText?.match(/\\graphicspath\s*\{((?:\s*\{[^}]*\})+)\s*\}/)
  if (declared) {
    for (const match of declared[1].matchAll(/\{([^}]*)\}/g)) {
      graphicsPaths.push(match[1])
    }
  }
  return {
    labelsByPath,
    citeKeysByPath,
    paths: new Set([...docs.keys(), ...binaryPaths].map(normalizePath)),
    graphicsPaths,
    mainDir: mainPath?.includes('/')
      ? mainPath.slice(0, mainPath.lastIndexOf('/'))
      : '',
  }
}

const IMAGE_EXTENSIONS = ['', '.pdf', '.png', '.jpg', '.jpeg', '.eps', '.svg']

/**
 * Does an \includegraphics / \input path exist? Returns 'ok', a
 * different-case match ("Did you mean …?"), or null when it is missing.
 */
export function findFile(
  index: ProjectIndex,
  name: string,
  kind: 'image' | 'tex'
): 'ok' | { closeMatch: string } | null {
  const folders = kind === 'image' ? ['', ...index.graphicsPaths] : ['']
  const extensions = kind === 'image' ? IMAGE_EXTENSIONS : ['', '.tex']
  const candidates = folders.flatMap(folder =>
    extensions.map(ext => normalizePath(`${index.mainDir}/${folder}/${name}${ext}`))
  )
  if (candidates.some(path => index.paths.has(path))) return 'ok'
  const lower = new Map([...index.paths].map(path => [path.toLowerCase(), path]))
  for (const candidate of candidates) {
    const close = lower.get(candidate.toLowerCase())
    if (close) return { closeMatch: close }
  }
  return null
}
