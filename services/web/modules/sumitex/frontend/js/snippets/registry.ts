/**
 * Every snippet in effect, from four places, first wins on a trigger:
 * the project's .sxs files, your personal snippets, your math shortcuts
 * in Settings (the older one-per-line format), then SumiTeX's built-in
 * ones (snippets/builtin). A line in Settings with a trigger alone
 * switches a built-in shortcut off ("mat" switches off mat3x4 and its
 * kind).
 *
 * The completion menu (completions/snippets-with-packages.ts) asks for
 * menu snippets; math auto-expansion (editor/math-auto-expand.ts) asks for
 * the auto and tab ones that end where the cursor is.
 */
import {
  parseSnippets,
  readCaptures,
  shownTrigger,
  SnippetDef,
  SnippetSource,
  type Preset,
} from './format'
import { renderBody, renderLabel } from './render'
import { BUILTIN_FILES } from './builtin'

export type MathRule = {
  trigger: string
  replacement: string
  /** From a trailing "% …" on its line */
  description?: string
}

/**
 * Your math shortcuts from Settings: one per line, the trigger, a space,
 * what it becomes. A trigger on its own switches a built-in one off; %
 * starts a comment, and at the end of a rule describes it.
 */
export function parseRules(text: string) {
  const rules: MathRule[] = []
  const off = new Set<string>()
  for (const raw of text.split(/\r\n?|\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('%')) continue
    // "@w \omega % omega": what follows an unescaped % describes it
    const [, body, description] =
      line.match(/^(.*?)(?:(?<!\\)\s%\s*(.*))?$/) ?? []
    const [, trigger, replacement] = body.trim().match(/^(\S+)\s*(.*)$/) ?? []
    if (!trigger) continue
    if (replacement) rules.push({ trigger, replacement, description })
    else off.add(trigger)
  }
  return { rules, off }
}

let builtins: SnippetDef[] | null = null

/** SumiTeX's own snippets, read once */
export function builtinDefs(): SnippetDef[] {
  if (!builtins) {
    builtins = BUILTIN_FILES.flatMap(
      ([group, text]) => parseSnippets(text, 'builtin', group).defs
    )
  }
  return builtins
}

const parsedCache = new Map<string, { text: string; defs: SnippetDef[] }>()

function parsedOnce(source: SnippetSource, text: string) {
  const cached = parsedCache.get(source)
  if (cached?.text === text) return cached.defs
  const defs = parseSnippets(text, source).defs
  parsedCache.set(source, { text, defs })
  return defs
}

export type Sources = {
  project?: string | null
  personal?: string
  rules?: string
}

function rulesAsDefs(rules: MathRule[]): SnippetDef[] {
  return rules.map((rule, i) => ({
    trigger: rule.trigger,
    label: rule.replacement,
    where: 'math',
    mode: 'auto',
    packages: [],
    preamble: [],
    body: rule.replacement,
    source: 'rules',
    description: rule.description,
    line: i + 1,
    captures: [],
    pattern: null,
    prefix: rule.trigger,
  }))
}

let combined: { key: string; defs: SnippetDef[] } | null = null

/** All snippets in effect, the first with a trigger hiding the others */
export function snippetDefs(sources: Sources): SnippetDef[] {
  const key = JSON.stringify([sources.project, sources.personal, sources.rules])
  if (combined?.key === key) return combined.defs
  const { rules, off } = parseRules(sources.rules ?? '')
  const seen = new Set<string>()
  const defs = [
    ...(sources.project ? parsedOnce('project', sources.project) : []),
    ...(sources.personal ? parsedOnce('personal', sources.personal) : []),
    ...rulesAsDefs(rules),
    ...builtinDefs().filter(
      def =>
        def.mode === 'menu' || !(off.has(def.trigger) || off.has(def.prefix))
    ),
  ].filter(def => !seen.has(def.trigger) && seen.add(def.trigger))
  combined = { key, defs }
  return defs
}

const fits = (def: SnippetDef, where: 'text' | 'math') =>
  def.where === 'any' || def.where === where

function asPreset(def: SnippetDef, trigger: string, values = {}): Preset {
  return {
    trigger,
    label: renderLabel(def, values),
    category: def.source === 'builtin' ? (def.group ?? 'builtin') : def.source,
    context: def.where === 'math' ? 'math' : 'text',
    template: renderBody(def, values),
    packages: def.packages,
    preamble: def.preamble,
  }
}

/**
 * The menu snippets for what's typed so far (\fi, \table3x4). A snippet
 * whose trigger takes a size is offered once the typed text is one.
 * `anywhere` (a snippet file) ignores text and math.
 */
export function menuPresets(
  sources: Sources,
  typed: string,
  where: 'text' | 'math',
  anywhere = false
): Preset[] {
  const presets: Preset[] = []
  for (const def of snippetDefs(sources)) {
    if (def.mode !== 'menu' || (!anywhere && !fits(def, where))) continue
    if (!def.pattern) {
      presets.push(asPreset(def, def.trigger))
      continue
    }
    const values = readCaptures(def, typed)
    if (values) presets.unshift(asPreset(def, typed, values))
  }
  return presets
}

/** For the menu: how to give a menu snippet a size ("\table3x4 for a size") */
export function sizeHint(sources: Sources, trigger: string): string | null {
  const sized = snippetDefs(sources).find(
    def => def.mode === 'menu' && def.pattern && def.prefix === trigger
  )
  if (!sized) return null
  const example = sized.trigger.replace(
    /#\{([a-z][a-z0-9]*):(?:(\d+)-(\d+)|letter)\}/g,
    (_, _name, min, max) =>
      min === undefined
        ? 'x'
        : String(Math.min(Math.max(3, Number(min)), Number(max)))
  )
  return `${example} for a size`
}

export type Expansion = {
  def: SnippetDef
  /** The trigger as typed (mat3x4) */
  typed: string
  /** What replaces it, for snippet() */
  template: string
}

const startsWithLetter = (text: string) => /^[A-Za-z]/.test(text)

/**
 * The auto (or tab) snippet the text before the cursor ends in, or null.
 * The longest match wins, then the earlier source. A trigger never fires
 * straight after a backslash (\sqrt typed in full), and one that starts
 * with a letter only at the start of a word.
 */
export function expansionAt(
  sources: Sources,
  before: string,
  where: 'text' | 'math',
  mode: 'auto' | 'tab'
): Expansion | null {
  let best: Expansion | null = null
  for (const def of snippetDefs(sources)) {
    if (def.mode !== mode || !fits(def, where)) continue
    let typed: string | null = null
    let values: Record<string, string> = {}
    if (!def.pattern) {
      if (before.endsWith(def.trigger)) typed = def.trigger
    } else {
      const tail = new RegExp(`(?:${def.pattern.source.slice(1, -1)})$`)
      const match = before.match(tail)
      if (match) {
        const read = readCaptures(def, match[0])
        if (read) {
          typed = match[0]
          values = read
        }
      }
    }
    if (typed === null) continue
    const prev = before[before.length - typed.length - 1] ?? ''
    if (prev === '\\') continue
    if (startsWithLetter(typed) && /[A-Za-z@]/.test(prev)) continue
    if (!best || typed.length > best.typed.length) {
      best = { def, typed, template: renderBody(def, values) }
    }
  }
  return best
}

/** The auto snippet whose trigger is exactly `typed` (<= then > is <=>) */
export function autoTrigger(
  sources: Sources,
  typed: string,
  where: 'text' | 'math'
): Expansion | null {
  const def = snippetDefs(sources).find(
    def =>
      def.mode === 'auto' &&
      !def.pattern &&
      def.trigger === typed &&
      fits(def, where)
  )
  return def ? { def, typed, template: renderBody(def) } : null
}

/** The built-in shortcuts (auto, in math), for Settings */
export function builtinShortcuts(): {
  trigger: string
  output: string
  /** The trigger as written, and before its first capture */
  key: string
  prefix: string
}[] {
  return builtinDefs()
    .filter(def => def.mode !== 'menu' && def.where !== 'text')
    .map(def => ({
      trigger: shownTrigger(def.trigger),
      output: def.pattern
        ? def.label.replace(/#\{([a-z0-9]+)\}/g, '‹$1›')
        : def.body,
      key: def.trigger,
      prefix: def.prefix,
    }))
}

/** The built-in menu triggers, for the starter text of a snippet file */
export const builtinMenuTriggers = () =>
  builtinDefs()
    .filter(def => def.mode === 'menu')
    .map(def => shownTrigger(def.trigger))

export type LibraryEntry = {
  def: SnippetDef
  /** on; off (a built-in shortcut switched off in your rules); replaced
   * (another snippet with the same trigger wins) */
  state: 'on' | 'off' | 'replaced'
}

/** Every snippet, in effect or not, for the snippet library */
export function libraryEntries(sources: Sources): LibraryEntry[] {
  const { rules, off } = parseRules(sources.rules ?? '')
  const all = [
    ...(sources.project ? parsedOnce('project', sources.project) : []),
    ...(sources.personal ? parsedOnce('personal', sources.personal) : []),
    ...rulesAsDefs(rules),
    ...builtinDefs(),
  ]
  const seen = new Set<string>()
  return all.map(def => {
    if (
      def.source === 'builtin' &&
      def.mode !== 'menu' &&
      (off.has(def.trigger) || off.has(def.prefix))
    ) {
      return { def, state: 'off' }
    }
    if (seen.has(def.trigger)) return { def, state: 'replaced' }
    seen.add(def.trigger)
    return { def, state: 'on' }
  })
}

/** Example values for a def's captures (3 for a size, x for a letter) */
export function sampleValues(def: SnippetDef): Record<string, string> {
  const values: Record<string, string> = {}
  for (const capture of def.captures) {
    values[capture.name] =
      capture.kind === 'letter'
        ? 'x'
        : String(Math.min(Math.max(3, capture.min), capture.max))
  }
  return values
}

/** Switch a built-in shortcut off (or back on) in your rules text */
export function switchBuiltin(rulesText: string, def: SnippetDef, on: boolean) {
  const lines = rulesText.split(/\r\n?|\n/)
  if (on) {
    return lines
      .filter(line => {
        const trigger = line.trim()
        return trigger !== def.trigger && trigger !== def.prefix
      })
      .join('\n')
  }
  const text = rulesText.replace(/\s+$/, '')
  return (text ? text + '\n' : '') + def.trigger
}
