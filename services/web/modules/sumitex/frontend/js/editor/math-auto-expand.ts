/**
 * Snippets that expand without the menu (guide Phase 4; features list, 8):
 * the auto ones as soon as their trigger is typed, the tab ones when Tab
 * is pressed after it. Math shortcuts are auto snippets: // becomes
 * \frac{▮}{}, @a becomes \alpha, mat3x4 a 3 × 4 matrix. Which snippets
 * there are, and where, is snippets/registry.ts's business; this file
 * does the typing.
 *
 * - Ctrl+Z right after an expansion gives back exactly what you typed.
 * - Placeholders work as in any snippet: Tab moves to the next one.
 * - A letter typed straight after \alpha gets a space first (\alpha b, not
 *   the undefined \alphab), and <= followed by > becomes \iff.
 * - Letter triggers (sq, sum, RR…) fire only at the start of a word, so
 *   \sqrt, \int and \sum typed in full stay as they are.
 * - Packages a snippet names or its commands need are added in the same
 *   step when the open file holds the preamble; in a chapter, the
 *   missing-package linter offers the fix instead.
 * - Nothing fires in comments, nor in \text{…} inside math.
 * - Settings → Editor turns it off and holds your own shortcuts.
 * - In Vim mode it works in insert mode only.
 */
import {
  EditorState,
  Extension,
  Prec,
  TransactionSpec,
} from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { isolateHistory } from '@codemirror/commands'
import { Completion, completionStatus, snippet } from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import { getMathExpand, getMathRules } from '../settings/prefs'
import { getPersonalSnippets } from '../settings/account-prefs'
import { mathContextAt } from './math-context'
import { COMMANDS, ENVIRONMENTS } from '../diagnostics/packages'
import {
  preambleOf,
  readPreamble,
  stripComments,
} from '../diagnostics/preamble'
import { getProjectPreamble } from '../diagnostics/preamble-store'
import { packageInsertion, preambleLineInsertion } from './add-package'
import { snippetTemplate } from '../completions/snippets-with-packages'
import {
  autoTrigger,
  Expansion,
  expansionAt,
  Sources,
} from '../snippets/registry'

export { parseRules } from '../snippets/registry'

const sources = (): Sources => ({
  project: getProjectPreamble().snippets ?? null,
  personal: getPersonalSnippets(),
  rules: getMathRules(),
})

/** Where expansions may happen at pos: math, text, or nowhere */
function whereAt(state: EditorState, pos: number): 'math' | 'text' | null {
  const context = mathContextAt(state, pos)
  if (context === 'math-text') return null
  if (context === 'math') return 'math'
  for (
    let node: ReturnType<typeof syntaxTree>['topNode'] | null = syntaxTree(
      state
    ).resolveInner(pos, -1);
    node;
    node = node.parent
  ) {
    if (/Comment/.test(node.type.name)) return null
  }
  return 'text'
}

/** Packages the output needs and the open file's preamble lacks */
function missingPackages(state: EditorState, expansion: Expansion): string[] {
  const text = state.doc.toString()
  if (!/\\documentclass/.test(stripComments(preambleOf(text)))) return []
  const preamble = readPreamble(text, getProjectPreamble().projectFiles)
  if (!preamble.known) return []
  const output = expansion.template
  const providers = [
    ...[...output.matchAll(/\\begin\{([A-Za-z*]+)\}/g)].map(
      match => ENVIRONMENTS[match[1]]
    ),
    ...[...output.matchAll(/\\([A-Za-z]+)/g)].map(match => COMMANDS[match[1]]),
  ]
  const names = new Set<string>()
  for (const name of expansion.def.packages) {
    if (!preamble.loaded.has(name)) names.add(name)
  }
  for (const provider of providers) {
    if (!provider) continue
    const loaded = [provider.suggest, ...(provider.alsoFrom ?? [])].some(name =>
      preamble.loaded.has(name)
    )
    if (!loaded) names.add(provider.suggest)
  }
  return [...names]
}

// The expansion being dispatched: the filter below adds its package and
// preamble lines and keeps it a step of its own in the undo history
let pending: { packages: string[]; preamble: string[] } | null = null

const expansionFilter = EditorState.transactionFilter.of(tr => {
  if (!pending || !tr.docChanged) return tr
  const { packages, preamble } = pending
  pending = null
  let text = tr.newDoc.toString()
  const specs: TransactionSpec[] = [
    tr,
    { annotations: isolateHistory.of('full') },
  ]
  const add = (insertion: { from: number; insert: string } | null) => {
    if (!insertion) return
    text =
      text.slice(0, insertion.from) +
      insertion.insert +
      text.slice(insertion.from)
    specs.push({ changes: insertion, sequential: true })
  }
  for (const name of packages) add(packageInsertion(text, name))
  for (const line of preamble) add(preambleLineInsertion(text, line))
  return specs
})

// The last plain expansion, for what the next keystroke can do with it
let last: { from: number; to: number; output: string; typed: string } | null =
  null

/** Replace the trigger, which ends at `end`, by the expansion */
function expand(view: EditorView, end: number, expansion: Expansion) {
  const start = end - expansion.typed.length
  const output = expansion.template
  const ownPreamble = /\\documentclass/.test(
    stripComments(preambleOf(view.state.doc.toString()))
  )
  pending = {
    packages: missingPackages(view.state, expansion),
    preamble: ownPreamble ? expansion.def.preamble : [],
  }
  try {
    if (output.includes('#{')) {
      snippet(snippetTemplate(output))(
        view,
        { label: expansion.typed } as Completion,
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
      last = { from: to - output.length, to, output, typed: expansion.typed }
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
  expansion: Expansion
) {
  view.dispatch({
    changes: { from, to, insert: typed },
    selection: { anchor: from + typed.length },
    userEvent: 'input.type',
  })
  expand(view, from + typed.length, expansion)
}

const inputHandler = EditorView.inputHandler.of((view, from, to, text) => {
  const previous = last
  last = null
  if (!getMathExpand() || text.length !== 1 || from !== to) return false
  if (view.composing || view.state.readOnly) return false
  if (view.state.selection.ranges.length > 1) return false
  const where = whereAt(view.state, from)
  if (!where) return false
  const all = sources()

  // Straight after an expansion: a longer trigger (<= then >), or a letter
  // that would run into the command (\alpha then b)
  if (
    previous &&
    previous.to === from &&
    view.state.sliceDoc(previous.from, previous.to) === previous.output
  ) {
    const longer = autoTrigger(all, previous.typed + text, where)
    if (longer) {
      typeThenExpand(view, previous.from, from, longer.typed, longer)
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

  const before = view.state.sliceDoc(Math.max(0, from - 48), from) + text
  const expansion = expansionAt(all, before, where, 'auto')
  if (!expansion) return false
  typeThenExpand(view, from, to, text, expansion)
  return true
})

// Tab after a [tab] snippet's trigger expands it; otherwise Tab does what
// it always does (next placeholder, indent, accept a completion). Highest,
// as Overleaf's own Tab (indent) is high and would come first.
const tabKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Tab',
      run: view => {
        if (!getMathExpand() || view.state.readOnly) return false
        if (completionStatus(view.state) === 'active') return false
        const { main } = view.state.selection
        if (!main.empty || view.state.selection.ranges.length > 1) return false
        const where = whereAt(view.state, main.head)
        if (!where) return false
        const before = view.state.sliceDoc(
          Math.max(0, main.head - 48),
          main.head
        )
        const expansion = expansionAt(sources(), before, where, 'tab')
        if (!expansion) return false
        last = null
        expand(view, main.head, expansion)
        return true
      },
    },
  ])
)

export const mathAutoExpand = (): Extension => {
  // Read the rules now, so rules kept in this browser move to the account
  // on the first visit, not only when a trigger is first typed
  getMathRules()
  return [inputHandler, tabKeymap, expansionFilter]
}
