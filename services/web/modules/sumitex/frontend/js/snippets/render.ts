/**
 * Turning a snippet's body into the text CodeMirror's snippet() inserts
 * (format.ts describes the directives): captures are filled in, then
 * \rows, \cols, \lines and \repeat are unrolled (outside in), then
 * \ifsame is decided.
 */
import type { SnippetDef } from './format'

const LOOPS: Record<string, { join: string; index: string }> = {
  rows: { join: ' \\\\\n', index: '@row' },
  cols: { join: ' & ', index: '@col' },
  lines: { join: '\n', index: '@i' },
  repeat: { join: '', index: '@i' },
}

// The most a directive repeats, whatever was typed
const MAX_REPEAT = 50

/** The balanced {…} starting exactly at `at`, or null */
function braced(
  text: string,
  at: number
): { content: string; end: number } | null {
  if (text[at] !== '{') return null
  let depth = 0
  for (let i = at; i < text.length; i++) {
    const char = text[i]
    if (char === '\\') {
      i++
      continue
    }
    if (char === '{') depth++
    else if (char === '}' && --depth === 0) {
      return { content: text.slice(at + 1, i), end: i + 1 }
    }
  }
  return null
}

/** Arguments of a directive whose name ends just before `at` */
function args(text: string, at: number, count: number) {
  const found: string[] = []
  let end = at
  for (let n = 0; n < count; n++) {
    const arg = braced(text, end)
    if (!arg) return null
    found.push(arg.content)
    end = arg.end
  }
  return { found, end }
}

/** #{name} → its value, for captures only; other placeholders stay */
export function fillCaptures(text: string, values: Record<string, string>) {
  return text.replace(/#\{([a-z][a-z0-9]*)\}/g, (whole, name) =>
    name in values ? values[name] : whole
  )
}

function count(arg: string, values: Record<string, string>) {
  const text = arg.trim()
  const n = Number(text in values ? values[text] : text)
  return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_REPEAT) : 0
}

/** Unroll the loop directives, outermost first */
function unroll(text: string, values: Record<string, string>): string {
  const directive = /\\(rows|cols|lines|repeat)(?=\{)/g
  let out = ''
  let last = 0
  for (let match = directive.exec(text); match; match = directive.exec(text)) {
    const found = args(text, match.index + match[0].length, 2)
    if (!found) continue
    const [times, inner] = found.found
    const loop = LOOPS[match[1]]
    const parts = Array.from({ length: count(times, values) }, (_, i) =>
      unroll(inner.split(loop.index).join(String(i + 1)), values)
    )
    out += text.slice(last, match.index) + parts.join(loop.join)
    last = found.end
    directive.lastIndex = found.end
  }
  return out + text.slice(last)
}

/** Decide every \ifsame{a}{b}{then}{else}, innermost first */
function decide(text: string): string {
  for (let guard = 0; guard < 1000; guard++) {
    const at = text.lastIndexOf('\\ifsame{')
    if (at < 0) return text
    const found = args(text, at + '\\ifsame'.length, 4)
    if (!found) return text
    const [a, b, then, otherwise] = found.found
    text =
      text.slice(0, at) +
      (a.trim() === b.trim() ? then : otherwise) +
      text.slice(found.end)
  }
  return text
}

/** The template to insert for a def, with the values its trigger captured */
export function renderBody(
  def: Pick<SnippetDef, 'body'>,
  values: Record<string, string> = {}
) {
  return decide(unroll(fillCaptures(def.body, values), values))
}

/** The menu label for a def, with the values its trigger captured */
export const renderLabel = (
  def: Pick<SnippetDef, 'label'>,
  values: Record<string, string> = {}
) => fillCaptures(def.label, values)
