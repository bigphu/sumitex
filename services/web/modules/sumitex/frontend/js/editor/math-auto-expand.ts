/**
 * Math auto-expansion (guide Phase 4; features list, 8).
 *
 * Inside math only ($…$, \[…\], equation, align…), short triggers expand as
 * you type: // becomes \frac{▮}{}, @a becomes \alpha, -> becomes \to. In
 * text, comments and \text{…} nothing happens.
 *
 * - Ctrl+Z right after an expansion gives back exactly what you typed.
 * - Placeholders ({▮}) work like a snippet's: Tab moves to the next one.
 * - A letter typed straight after \alpha gets a space first (\alpha b, not
 *   the undefined \alphab), and <= followed by > becomes \iff.
 * - Word triggers (sq, sum, int, RR…) fire only at the start of a word, so
 *   \sqrt, \int and \sum typed in full stay as they are.
 * - A command that needs a package (\mathbb) adds it in the same step when
 *   the open file holds the preamble; in a chapter, the missing-package
 *   linter offers the fix instead.
 * - Settings → Editor → SumiTeX turns it off and holds your own rules.
 * - In Vim mode it works in insert mode only (normal-mode keys never reach
 *   the editor as typed text).
 */
import {
  EditorState,
  Extension,
  TransactionSpec,
} from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { isolateHistory } from '@codemirror/commands'
import { Completion, snippet } from '@codemirror/autocomplete'
import { getMathExpand, getMathRules } from '../settings/prefs'
import { mathContextAt } from './math-context'
import { COMMANDS } from '../diagnostics/packages'
import { preambleOf, readPreamble, stripComments } from '../diagnostics/preamble'
import { getProjectPreamble } from '../diagnostics/preamble-store'
import { packageInsertion } from './add-package'
import { snippetTemplate } from '../completions/snippets-with-packages'

export type MathRule = { trigger: string; replacement: string }

const GREEK: [string, string][] = [
  ['a', 'alpha'], ['b', 'beta'], ['g', 'gamma'], ['d', 'delta'],
  ['e', 'epsilon'], ['z', 'zeta'], ['h', 'eta'], ['t', 'theta'],
  ['i', 'iota'], ['k', 'kappa'], ['l', 'lambda'], ['m', 'mu'], ['n', 'nu'],
  ['x', 'xi'], ['p', 'pi'], ['r', 'rho'], ['s', 'sigma'], ['u', 'upsilon'],
  ['f', 'phi'], ['c', 'chi'], ['y', 'psi'], ['o', 'omega'],
  ['G', 'Gamma'], ['D', 'Delta'], ['T', 'Theta'], ['L', 'Lambda'],
  ['X', 'Xi'], ['P', 'Pi'], ['S', 'Sigma'], ['U', 'Upsilon'], ['F', 'Phi'],
  ['Y', 'Psi'], ['O', 'Omega'],
]

/** #{} marks a placeholder, as in snippets; the cursor starts at the first */
export const BUILT_IN_RULES: MathRule[] = [
  { trigger: '//', replacement: '\\frac{#{}}{#{}}#{}' },
  { trigger: 'sq', replacement: '\\sqrt{#{}}#{}' },
  { trigger: '^^', replacement: '^{#{}}#{}' },
  { trigger: '__', replacement: '_{#{}}#{}' },
  ...GREEK.map(([key, name]) => ({ trigger: `@${key}`, replacement: `\\${name}` })),
  { trigger: '<->', replacement: '\\leftrightarrow' },
  { trigger: '->', replacement: '\\to' },
  { trigger: '=>', replacement: '\\implies' },
  { trigger: '<=>', replacement: '\\iff' },
  { trigger: '<=', replacement: '\\leq' },
  { trigger: '>=', replacement: '\\geq' },
  { trigger: '!=', replacement: '\\neq' },
  { trigger: 'ooo', replacement: '\\infty' },
  { trigger: 'sum', replacement: '\\sum_{#{}}^{#{}}#{}' },
  { trigger: 'int', replacement: '\\int_{#{}}^{#{}}#{}' },
  ...['R', 'N', 'Z', 'Q', 'C'].map(letter => ({
    trigger: letter + letter,
    replacement: `\\mathbb{${letter}}`,
  })),
]

/**
 * The user's rules (Settings): one per line, the trigger, a space, what it
 * becomes. A trigger on its own switches a built-in one off; % starts a
 * comment.
 */
export function parseRules(text: string) {
  const rules: MathRule[] = []
  const off = new Set<string>()
  for (const raw of text.split(/\r\n?|\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('%')) continue
    const [, trigger, replacement] = line.match(/^(\S+)\s*(.*)$/) ?? []
    if (!trigger) continue
    if (replacement) rules.push({ trigger, replacement })
    else off.add(trigger)
  }
  return { rules, off }
}

let cache: { text: string; rules: MathRule[] } | null = null

/** The rules in effect, longest trigger first */
export function activeRules(): MathRule[] {
  const text = getMathRules()
  if (cache?.text === text) return cache.rules
  const own = parseRules(text)
  const mine = new Set(own.rules.map(rule => rule.trigger))
  const rules = [
    ...own.rules,
    ...BUILT_IN_RULES.filter(
      rule => !mine.has(rule.trigger) && !own.off.has(rule.trigger)
    ),
  ].sort((a, b) => b.trigger.length - a.trigger.length)
  cache = { text, rules }
  return rules
}

const isWord = (trigger: string) => /^[A-Za-z]+$/.test(trigger)

/** The rule the text before the cursor (typed character included) ends in */
function ruleFor(before: string, rules: MathRule[]): MathRule | null {
  for (const rule of rules) {
    if (!before.endsWith(rule.trigger)) continue
    const prev = before[before.length - rule.trigger.length - 1] ?? ''
    // Not after a backslash (\^ or \sqrt typed in full), and a word only at
    // the start of a word
    if (prev === '\\') continue
    if (isWord(rule.trigger) && /[A-Za-z@]/.test(prev)) continue
    return rule
  }
  return null
}

/** Packages the output's commands need, when the open file's preamble lacks them */
function missingPackages(state: EditorState, output: string): string[] {
  const text = state.doc.toString()
  if (!/\\documentclass/.test(stripComments(preambleOf(text)))) return []
  const preamble = readPreamble(text, getProjectPreamble().projectFiles)
  if (!preamble.known) return []
  const names = new Set<string>()
  for (const match of output.matchAll(/\\([A-Za-z]+)/g)) {
    const provider = COMMANDS[match[1]]
    if (!provider) continue
    const loaded = [provider.suggest, ...(provider.alsoFrom ?? [])].some(name =>
      preamble.loaded.has(name)
    )
    if (!loaded) names.add(provider.suggest)
  }
  return [...names]
}

// The expansion being dispatched: the filter below adds its package lines
// and keeps it a step of its own in the undo history
let pending: { packages: string[] } | null = null

const expansionFilter = EditorState.transactionFilter.of(tr => {
  if (!pending || !tr.docChanged) return tr
  const { packages } = pending
  pending = null
  let text = tr.newDoc.toString()
  const specs: TransactionSpec[] = [
    tr,
    { annotations: isolateHistory.of('full') },
  ]
  for (const name of packages) {
    const insertion = packageInsertion(text, name)
    if (!insertion) continue
    text =
      text.slice(0, insertion.from) + insertion.insert + text.slice(insertion.from)
    specs.push({ changes: insertion, sequential: true })
  }
  return specs
})

// The last plain expansion, for what the next keystroke can do with it
let last: { from: number; to: number; output: string; typed: string } | null =
  null

/** Replace the trigger, which ends at `end`, by the rule's output */
function expand(view: EditorView, end: number, rule: MathRule) {
  const start = end - rule.trigger.length
  const output = rule.replacement
  pending = { packages: missingPackages(view.state, output) }
  try {
    if (output.includes('#{')) {
      snippet(snippetTemplate(output))(
        view,
        { label: rule.trigger } as Completion,
        start,
        end
      )
      last = null
    } else {
      view.dispatch({
        changes: { from: start, to: end, insert: output },
        selection: { anchor: start + output.length },
        userEvent: 'input.sumitex-expand',
      })
      const to = view.state.selection.main.head
      last = { from: to - output.length, to, output, typed: rule.trigger }
    }
  } finally {
    pending = null
  }
}

/** Type `typed` over from…to as ordinary input, then expand its end */
function typeThenExpand(
  view: EditorView,
  from: number,
  to: number,
  typed: string,
  rule: MathRule
) {
  view.dispatch({
    changes: { from, to, insert: typed },
    selection: { anchor: from + typed.length },
    userEvent: 'input.type',
  })
  expand(view, from + typed.length, rule)
}

const inputHandler = EditorView.inputHandler.of((view, from, to, text) => {
  const previous = last
  last = null
  if (!getMathExpand() || text.length !== 1 || from !== to) return false
  if (view.composing || view.state.readOnly) return false
  const { selection } = view.state
  if (selection.ranges.length > 1) return false
  if (mathContextAt(view.state, from) !== 'math') return false

  const rules = activeRules()

  // Straight after an expansion: a longer trigger (<= then >), or a letter
  // that would run into the command (\alpha then b)
  if (
    previous &&
    previous.to === from &&
    view.state.sliceDoc(previous.from, previous.to) === previous.output
  ) {
    const longer = rules.find(rule => rule.trigger === previous.typed + text)
    if (longer) {
      typeThenExpand(view, previous.from, from, longer.trigger, longer)
      return true
    }
    if (/^[A-Za-z]$/.test(text) && /\\[A-Za-z]+$/.test(previous.output)) {
      view.dispatch({
        changes: { from, insert: ` ${text}` },
        selection: { anchor: from + 2 },
        userEvent: 'input.type',
      })
      return true
    }
  }

  const before = view.state.sliceDoc(Math.max(0, from - 32), from) + text
  const rule = ruleFor(before, rules)
  if (!rule) return false
  typeThenExpand(view, from, to, text, rule)
  return true
})

export const mathAutoExpand = (): Extension => [inputHandler, expansionFilter]
