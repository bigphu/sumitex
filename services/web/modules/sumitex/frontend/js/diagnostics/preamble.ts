/**
 * Reading a LaTeX preamble: the document class, the packages it loads and
 * the commands the author defines. Plain text in, plain data out, so it
 * works on the open file, on main.tex from the project snapshot, and on a
 * project's own .cls and .sty files.
 */
import { CLASSES, withLoaded } from './packages'

/** The text without comments (a % not preceded by a backslash) */
export const stripComments = (text: string) =>
  text.replace(/(^|[^\\])%.*$/gm, '$1')

/** The text before \begin{document}, or all of it when there is none */
export const preambleOf = (text: string) => {
  const at = text.search(/\\begin\s*\{document\}/)
  return at === -1 ? text : text.slice(0, at)
}

export type ParsedFile = {
  documentClass: string | null
  /** A class file's \LoadClass, the class it builds on */
  baseClass: string | null
  packages: Set<string>
  defined: Set<string>
}

const LOAD = /\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g
const DEFINE =
  /\\(?:newcommand|renewcommand|providecommand|DeclareMathOperator|NewDocumentCommand|RenewDocumentCommand|DeclareRobustCommand|newrobustcmd)\*?\s*\{?\s*\\([a-zA-Z@]+)|\\(?:def|let|gdef|edef|xdef)\s*\\([a-zA-Z@]+)/g
const DEFINE_ENV =
  /\\(?:newenvironment|renewenvironment|NewDocumentEnvironment|newtheorem)\*?\s*\{([^}]+)\}/g

/** What one file loads and defines */
export function parseFile(text: string): ParsedFile {
  const clean = stripComments(text)
  const packages = new Set<string>()
  for (const match of clean.matchAll(LOAD)) {
    for (const name of match[1].split(',')) {
      const trimmed = name.trim()
      if (trimmed) packages.add(trimmed)
    }
  }
  const defined = new Set<string>()
  for (const match of clean.matchAll(DEFINE)) defined.add(match[1] ?? match[2])
  for (const match of clean.matchAll(DEFINE_ENV)) defined.add(`env:${match[1]}`)
  return {
    documentClass:
      clean.match(/\\documentclass\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/)?.[1].trim() ??
      null,
    baseClass:
      clean.match(/\\LoadClass(?:WithOptions)?\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/)?.[1].trim() ??
      null,
    packages,
    defined,
  }
}

export type Preamble = {
  /** False when the class may load packages we can't see */
  known: boolean
  /** Every package loaded, directly or by another package or the class */
  loaded: Set<string>
  /** Commands (and env:names) the author defines */
  defined: Set<string>
  documentClass: string | null
}

/**
 * The packages and definitions in effect for a document: its main file's
 * preamble, the project's own class and packages it uses, and what the
 * class brings.
 *
 * @param mainText the main file (the one with \documentclass)
 * @param projectFiles the project's .cls and .sty files, by base name
 *   ("thesis.cls" → its text)
 */
export function readPreamble(
  mainText: string,
  projectFiles: Map<string, string> = new Map()
): Preamble {
  const main = parseFile(preambleOf(mainText))
  const names = new Set(main.packages)
  const defined = new Set(main.defined)
  let known = true

  // The class: a known one, or the project's own .cls built on one
  const cls = main.documentClass
  if (cls && CLASSES[cls]) {
    CLASSES[cls].forEach(name => names.add(name))
  } else if (cls && projectFiles.has(`${cls}.cls`)) {
    const own = parseFile(projectFiles.get(`${cls}.cls`)!)
    own.packages.forEach(name => names.add(name))
    own.defined.forEach(name => defined.add(name))
    if (own.baseClass) {
      if (CLASSES[own.baseClass]) {
        CLASSES[own.baseClass].forEach(name => names.add(name))
      } else {
        known = false
      }
    }
  } else if (cls) {
    known = false
  }

  // The project's own packages, one level deep
  for (const name of [...names]) {
    const sty = projectFiles.get(`${name}.sty`)
    if (!sty) continue
    const own = parseFile(sty)
    own.packages.forEach(more => names.add(more))
    own.defined.forEach(more => defined.add(more))
  }

  return { known, loaded: withLoaded(names), defined, documentClass: cls }
}
