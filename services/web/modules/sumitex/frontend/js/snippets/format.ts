/**
 * The snippet format (.sxs): one format for SumiTeX's built-in snippets
 * (snippets/builtin), a project's snippets.sxs and your personal snippets.
 * Math shortcuts are snippets too: ones that expand as you type.
 *
 *   \snippet[options]{trigger}{Label}[packages,it,needs]
 *   \preamble{\newtheorem{lemma}{Lemma}}     optional, any number
 *   ...the body, inserted as written...
 *   \endsnippet
 *
 *   \shortcut[options]{trigger}{output}      the same on one line, for a
 *                                            short output (math, as you type)
 *
 * Options, comma-separated, in any order:
 * - where: text (the default for \snippet), math (the default for
 *   \shortcut), any
 * - how: menu (the default for \snippet: offered in the completion menu),
 *   auto (expands as soon as the trigger is typed; the default for
 *   \shortcut), tab (expands when Tab is pressed after the trigger)
 *
 * Triggers: a menu trigger is a command (\fig, \table#{r:1-20}x#{c:1-12});
 * an auto or tab trigger is any run of characters without spaces (//, EE,
 * mat#{r:1-9}x#{c:1-9}). Letter triggers fire only at the start of a word,
 * so \sqrt typed in full never fires sq.
 *
 * Captures in a trigger: #{name:1-9} takes a number in that range,
 * #{name:letter} a single letter. Auto triggers take numbers up to 9 (they
 * can't tell 1 from 12 while you type).
 *
 * In the body (and the label), see render.ts:
 * - #{} is an empty placeholder, #{name} a named one (Tab moves through
 *   them; the same name twice is one field, edited together). A capture's
 *   name stands for what was typed: #{r} is the 3 of \table3x4.
 * - \rows{r}{...} repeats for each row, joined by \\ and a new line;
 *   \cols{c}{...} for each column, joined by &; \lines{n}{...} once per
 *   line; \repeat{n}{...} with nothing between. Inside them, @row, @col
 *   and @i are the 1-based position. A count is a capture's name or a
 *   number.
 * - \ifsame{a}{b}{then}{else}: then when a and b are the same text (after
 *   @row/@col are filled in), as in an identity matrix.
 *
 * Placeholder names hold no braces (the first } ends them) and aren't only
 * digits (#{1} would be a field number).
 */

export type SnippetWhere = 'text' | 'math' | 'any'
export type SnippetMode = 'menu' | 'auto' | 'tab'
export type SnippetSource = 'builtin' | 'project' | 'personal' | 'rules'

export type Capture =
  | { name: string; kind: 'number'; min: number; max: number }
  | { name: string; kind: 'letter' }

export type SnippetDef = {
  /** As written: \table#{r:1-20}x#{c:1-12} */
  trigger: string
  /** May hold captures: Table, #{r} × #{c} */
  label: string
  where: SnippetWhere
  mode: SnippetMode
  packages: string[]
  preamble: string[]
  /** The body, with placeholders and directives (render.ts) */
  body: string
  source: SnippetSource
  /** For built-in ones: the file it comes from (statistics, tables…) */
  group?: string
  /** 1-based line of its header, in the file it was read from */
  line: number
  captures: Capture[]
  /** For a trigger with captures: matches the whole typed trigger */
  pattern: RegExp | null
  /** The text before the first capture (the whole trigger without any) */
  prefix: string
}

/** Kept for the completion code: a snippet ready to insert */
export type Preset = {
  trigger: string
  label: string
  category: string
  context?: 'text' | 'math'
  template: string
  packages?: string[]
  preamble?: string[]
}

export type FormatProblem = {
  line: number
  message: string
  severity: 'error' | 'warning'
}

const END = /^\s*\\endsnippet\s*(?:%.*)?$/
const START = /^\s*\\(snippet|shortcut)\b/

/** The balanced {group} or [group] at `at` (after spaces), or null */
function group(
  text: string,
  at: number,
  open: '{' | '['
): { content: string; end: number } | null {
  let i = at
  while (text[i] === ' ' || text[i] === '\t') i++
  if (text[i] !== open) return null
  const close = open === '{' ? '}' : ']'
  let depth = 0
  for (let j = i; j < text.length; j++) {
    const char = text[j]
    if (char === '\\') {
      j++
      continue
    }
    if (char === open) depth++
    else if (char === close && --depth === 0) {
      return { content: text.slice(i + 1, j), end: j + 1 }
    }
  }
  return null
}

const CAPTURE = /#\{([a-z][a-z0-9]*):(?:(\d+)-(\d+)|(letter))\}/g
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The captures in a trigger, its regular expression and its prefix */
export function compileTrigger(trigger: string): {
  captures: Capture[]
  pattern: RegExp | null
  prefix: string
  problems: string[]
} {
  const captures: Capture[] = []
  const problems: string[] = []
  let source = ''
  let last = 0
  let prefix: string | null = null
  for (const match of trigger.matchAll(CAPTURE)) {
    const [whole, name, min, max, letter] = match
    const before = trigger.slice(last, match.index)
    if (prefix === null) prefix = before
    source += escapeRegExp(before)
    if (captures.some(capture => capture.name === name)) {
      problems.push(`The capture ${name} is used twice`)
    }
    if (letter) {
      captures.push({ name, kind: 'letter' })
      source += '([A-Za-z])'
    } else {
      const low = Number(min)
      const high = Number(max)
      if (low > high || high > 99) {
        problems.push(
          `#{${name}:${min}-${max}}: a range runs from low to high, up to 99`
        )
      }
      captures.push({ name, kind: 'number', min: low, max: high })
      source += '(\\d{1,2})'
    }
    last = match.index! + whole.length
  }
  if (/#\{/.test(trigger.replace(CAPTURE, ''))) {
    problems.push('A capture is written #{name:1-9} or #{name:letter}')
  }
  if (!captures.length)
    return { captures, pattern: null, prefix: trigger, problems }
  source += escapeRegExp(trigger.slice(last))
  return {
    captures,
    pattern: new RegExp(`^${source}$`),
    prefix: prefix ?? '',
    problems,
  }
}

/** The values a typed trigger gives a def's captures, or null if it isn't one */
export function readCaptures(
  def: Pick<SnippetDef, 'pattern' | 'captures'>,
  typed: string
): Record<string, string> | null {
  if (!def.pattern) return null
  const match = typed.match(def.pattern)
  if (!match) return null
  const values: Record<string, string> = {}
  for (const [i, capture] of def.captures.entries()) {
    const value = match[i + 1]
    if (capture.kind === 'number') {
      const number = Number(value)
      if (value.length > 1 && value.startsWith('0')) return null
      if (number < capture.min || number > capture.max) return null
    }
    values[capture.name] = value
  }
  return values
}

function readOptions(
  text: string,
  kind: 'snippet' | 'shortcut'
): { where: SnippetWhere; mode: SnippetMode; problems: string[] } {
  let where: SnippetWhere = kind === 'shortcut' ? 'math' : 'text'
  let mode: SnippetMode = kind === 'shortcut' ? 'auto' : 'menu'
  const problems: string[] = []
  for (const option of text.split(',').map(part => part.trim())) {
    if (!option) continue
    if (option === 'text' || option === 'math' || option === 'any')
      where = option
    else if (option === 'menu' || option === 'auto' || option === 'tab')
      mode = option
    else
      problems.push(
        `Unknown option "${option}": use text, math or any, and menu, auto or tab`
      )
  }
  return { where, mode, problems }
}

/** \preamble{…} lines at the start of a body: taken out, and the rest */
function takePreamble(body: string[]): { preamble: string[]; rest: string[] } {
  const preamble: string[] = []
  let i = 0
  for (; i < body.length; i++) {
    const line = body[i]
    if (!/^\s*\\preamble\s*\{/.test(line)) break
    const found = group(
      line,
      line.indexOf('\\preamble') + '\\preamble'.length,
      '{'
    )
    if (!found) break
    preamble.push(found.content.trim())
  }
  return { preamble, rest: body.slice(i) }
}

/**
 * Read a snippet file. Problems are reported with their line and don't
 * stop the rest of the file from being read.
 */
export function parseSnippets(
  text: string,
  source: SnippetSource,
  group_?: string
): { defs: SnippetDef[]; problems: FormatProblem[] } {
  const defs: SnippetDef[] = []
  const problems: FormatProblem[] = []
  const lines = text.split(/\r\n?|\n/)
  const problem = (
    line: number,
    message: string,
    severity: 'error' | 'warning' = 'error'
  ) => problems.push({ line, message, severity })

  for (let i = 0; i < lines.length; i++) {
    const start = lines[i].match(START)
    if (!start) continue
    const kind = start[1] as 'snippet' | 'shortcut'
    const line = lines[i]
    const headerLine = i + 1
    let at = line.indexOf('\\' + kind) + kind.length + 1

    const options = group(line, at, '[')
    if (options) at = options.end
    const trigger = group(line, at, '{')
    const label = trigger && group(line, trigger.end, '{')
    if (!trigger || !label) {
      problem(
        headerLine,
        kind === 'snippet'
          ? 'Expected \\snippet{\\trigger}{Label}[packages]'
          : 'Expected \\shortcut{trigger}{output}'
      )
      continue
    }
    at = label.end
    const packages = group(line, at, '[')
    if (packages) at = packages.end
    if (!/^\s*(%.*)?$/.test(line.slice(at))) {
      problem(headerLine, 'Unexpected text after the header')
    }

    const {
      where,
      mode,
      problems: optionProblems,
    } = readOptions(options?.content ?? '', kind)
    for (const message of optionProblems) problem(headerLine, message)

    let body: string
    let preamble: string[] = []
    let labelText = label.content.trim()
    if (kind === 'shortcut') {
      body = label.content.trim()
      labelText = body
    } else {
      const bodyLines: string[] = []
      for (i++; i < lines.length && !END.test(lines[i]); i++)
        bodyLines.push(lines[i])
      if (i >= lines.length) {
        problem(headerLine, 'No \\endsnippet after this')
        break
      }
      const taken = takePreamble(bodyLines)
      preamble = taken.preamble
      body = taken.rest.join('\n')
    }

    const triggerText = trigger.content.trim()
    const compiled = compileTrigger(triggerText)
    for (const message of compiled.problems) problem(headerLine, message)
    const literal = triggerText.replace(CAPTURE, '1')
    if (!triggerText) {
      problem(headerLine, 'The trigger is empty')
      continue
    }
    if (mode === 'menu' && !/^\\[A-Za-z][A-Za-z0-9]*$/.test(literal)) {
      problem(
        headerLine,
        'A menu trigger is a command: a backslash, then letters (and captures)'
      )
      continue
    }
    if (mode !== 'menu' && /\s/.test(literal)) {
      problem(headerLine, 'A trigger has no spaces')
      continue
    }
    if (
      mode === 'auto' &&
      compiled.captures.some(c => c.kind === 'number' && c.max > 9)
    ) {
      problem(
        headerLine,
        'An auto trigger takes numbers up to 9 (it expands as you type); use [tab] or [menu] for more'
      )
      continue
    }
    if (/#\{[^}]*\{/.test(body)) {
      problem(headerLine, "A placeholder's name can't hold braces", 'warning')
    }
    if (/#\{\d+\}/.test(body)) {
      problem(
        headerLine,
        'A placeholder named only with digits comes out empty',
        'warning'
      )
    }

    defs.push({
      trigger: triggerText,
      label: labelText || triggerText,
      where,
      mode,
      packages: (packages?.content ?? '')
        .split(',')
        .map(name => name.trim())
        .filter(Boolean),
      preamble,
      body,
      source,
      group: group_,
      line: headerLine,
      captures: compiled.captures,
      pattern: compiled.pattern,
      prefix: compiled.prefix,
    })
  }
  return { defs, problems }
}

/** How a trigger reads in lists: \table‹r›x‹c› */
export const shownTrigger = (trigger: string) =>
  trigger.replace(CAPTURE, (_, name) => `‹${name}›`)
