/**
 * Helpers for scanning LaTeX source, shared by the linters.
 */

// Environments whose content is not LaTeX
const VERBATIM =
  /\\begin\s*\{(verbatim\*?|lstlisting|minted|comment|Verbatim)\}[\s\S]*?\\end\s*\{\1\}/g

/** The text with comments and verbatim blanked out, offsets kept */
export function codeOnly(text: string) {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ')
  return text
    .replace(/(^|[^\\])(%.*)$/gm, (_, before, comment) => before + blank(comment))
    .replace(VERBATIM, blank)
}

/**
 * A command written after an odd number of backslashes is escaped text
 * (\\text is a line break, then the word "text")
 */
export function escaped(text: string, at: number) {
  let count = 0
  for (let i = at - 1; i >= 0 && text[i] === '\\'; i--) count++
  return count % 2 === 1
}

/** A project path without ./ and with .. resolved */
export function normalizePath(path: string) {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}
