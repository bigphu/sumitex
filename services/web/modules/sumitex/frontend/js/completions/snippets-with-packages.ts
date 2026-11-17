/**
 * Snippets that bring their packages (guide Phase 4; features list, 7).
 *
 * Type \fig and the menu offers "Figure with image · adds graphicx". Enter
 * inserts the block with the cursor in the first placeholder; Tab and
 * Shift+Tab move between placeholders, Esc leaves them. If graphicx isn't
 * loaded, \usepackage{graphicx} goes in at the same moment, where the
 * "Add package" fix would put it (editor/add-package.ts).
 *
 * - In a file with its own preamble, the snippet and its package lines are
 *   one change, so one Ctrl+Z takes back both.
 * - In a chapter, the packages go into the main file first (SumiTeX opens
 *   it and comes back), then the snippet goes in. Undo is then per file.
 * - Shown alongside Overleaf's own completions, ranked first.
 * - Math presets (\cases, \bmat) are offered only inside math, the others
 *   only outside it.
 */
import {
  EditorState,
  Extension,
  TransactionSpec,
} from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import {
  Completion,
  CompletionContext,
  CompletionResult,
  snippet,
} from '@codemirror/autocomplete'
import {
  Preamble,
  parseFile,
  preambleOf,
  readPreamble,
  stripComments,
} from '../diagnostics/preamble'
import { getProjectPreamble, wasJustAdded } from '../diagnostics/preamble-store'
import {
  packageInsertion,
  preambleLineInsertion,
  preambleLineNeeded,
  requestAddPackage,
} from '../editor/add-package'
import { debugConsole } from '@/utils/debugging'
import { PRESETS, Preset, PresetContext } from './presets'
import { projectPresets } from './project-snippets'
import { isSnippetText } from './snippet-file'

// Ahead of the stock completions (boost runs from -99 to 99)
const BOOST = 50

// A new snippet in a snippet file: trigger, label, packages, then the text
const SNIPPET_SKELETON =
  '\\snippet{\\#{trigger}}{#{Label}}[#{packages}]\n#{}\n\\endsnippet\n'

// How long to wait for a chapter to come back after editing the main file
const RETURN_TIMEOUT_MS = 5000

/** Inside math, but not in \text{…} and the like */
function contextAt(state: EditorState, pos: number): PresetContext {
  for (
    let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1);
    node;
    node = node.parent
  ) {
    if (node.type.is('MathTextCommand')) return 'text'
    if (
      node.type.is('Math') ||
      node.type.is('InlineMath') ||
      node.type.is('DisplayMath')
    ) {
      return 'math'
    }
  }
  return 'text'
}

type Needs = {
  /** The open file holds the preamble */
  own: boolean
  packages: string[]
  preamble: string[]
}

type InEffect = {
  own: boolean
  /** The open file's preamble text, when it has one */
  text: string
  preamble: Preamble | null
}

/** The preamble in effect: the open file's own, or the main file's */
function inEffect(doc: string): InEffect {
  const text = preambleOf(doc)
  const own = /\\documentclass/.test(stripComments(text))
  const store = getProjectPreamble()
  return {
    own,
    text,
    preamble: own ? readPreamble(doc, store.projectFiles) : store.preamble,
  }
}

/** What a preset still needs, against the preamble in effect */
function needsOf({ own, text, preamble }: InEffect, preset: Preset): Needs {
  const packages = (preset.packages ?? []).filter(
    name => !preamble?.loaded.has(name) && !wasJustAdded(name)
  )
  const lines = (preset.preamble ?? []).filter(line =>
    own
      ? preambleLineNeeded(line, text)
      : // A chapter: what the main file defines (or everything, unread)
        !preamble ||
        [...parseFile(line).defined].some(name => !preamble.defined.has(name))
  )
  return { own, packages, preamble: lines }
}

// The package lines to add with the snippet that is being applied: the
// filter below picks them up from the snippet's own transaction
let pending: Needs | null = null

const addWithSnippet = EditorState.transactionFilter.of(tr => {
  if (!pending || !tr.docChanged) return tr
  const needs = pending
  pending = null
  let text = tr.newDoc.toString()
  const specs: TransactionSpec[] = [tr]
  const add = (insertion: { from: number; insert: string } | null) => {
    if (!insertion) return
    text =
      text.slice(0, insertion.from) + insertion.insert + text.slice(insertion.from)
    specs.push({ changes: insertion, sequential: true })
  }
  needs.packages.forEach(name => add(packageInsertion(text, name)))
  needs.preamble.forEach(line => add(preambleLineInsertion(text, line)))
  return specs
})

/**
 * A template for CodeMirror's snippet(): only #{…} is a placeholder, so
 * LaTeX's \{ and \} keep their backslash and ${ (as in ${n \choose k}$)
 * stays text
 */
export const snippetTemplate = (template: string) =>
  template.replace(/\\([{}])/g, '\\\\$1').replace(/\$\{/g, '$\\{')

function applyPreset(preset: Preset) {
  const insert = snippet(snippetTemplate(preset.template))
  return (view: EditorView, completion: Completion, from: number, to: number) => {
    const needs = needsOf(inEffect(view.state.doc.toString()), preset)
    const nothingElse = needs.packages.length + needs.preamble.length === 0

    if (needs.own || nothingElse) {
      pending = needs.own ? needs : null
      try {
        insert(view, completion, from, to)
      } finally {
        pending = null
      }
      return
    }

    // A chapter: load the packages in the main file, then insert here
    const trigger = view.state.sliceDoc(from, to)
    const length = view.state.doc.length
    void (async () => {
      // One visit to the main file for everything. A package that's there
      // already still lets the preamble lines go in.
      const [first, ...rest] = needs.packages.length
        ? needs.packages
        : (preset.packages ?? [])
      try {
        await requestAddPackage(first, {
          alsoAdd: rest,
          preambleLines: needs.preamble,
        })
      } catch (error) {
        debugConsole.error('SumiTeX: adding packages for a snippet', error)
      }
      // Wait for the chapter to be back in the editor (opening a file
      // resolves before its text is shown): the same text, trigger and all
      const back = () =>
        view.state.doc.length === length &&
        view.state.sliceDoc(from, to) === trigger
      for (let waited = 0; !back() && waited < RETURN_TIMEOUT_MS; ) {
        await new Promise(resolve => setTimeout(resolve, 50))
        waited += 50
      }
      if (!back()) return
      insert(view, completion, from, to)
    })()
  }
}

function detailOf(preset: Preset, needs: Needs) {
  const adds = [...needs.packages]
  if (needs.preamble.length) adds.push('its preamble line')
  return adds.length ? `${preset.label} · adds ${adds.join(', ')}` : preset.label
}

export default function snippetsWithPackages(
  context: CompletionContext
): CompletionResult | null {
  const word = context.matchBefore(/\\[a-zA-Z]*/)
  if (!word || (word.from === word.to && !context.explicit)) return null
  // Not when the backslash is escaped (\\fig is a line break and "fig")
  if (context.state.sliceDoc(word.from - 1, word.from) === '\\') return null

  const where = contextAt(context.state, word.from)
  const text = context.state.doc.toString()
  const store = getProjectPreamble()
  // In a snippet file, snippets go in as plain text for a template: no
  // packages are added anywhere, and \snippet starts a new one
  const snippetFile =
    store.currentPath?.endsWith('.sxs') || isSnippetText(text)
  const effect = inEffect(text)
  // The project's own snippets first; they replace built-in ones
  const own = projectPresets(store.snippets ?? null)
  const owned = new Set(own.map(preset => preset.trigger))
  const presets = [
    ...own,
    ...PRESETS.filter(preset => !owned.has(preset.trigger)),
  ]
  const options: Completion[] = presets
    .filter(preset => snippetFile || (preset.context ?? 'text') === where)
    .map(preset => ({
      label: preset.trigger,
      detail: snippetFile
        ? preset.label
        : detailOf(preset, needsOf(effect, preset)),
      type: preset.category === 'project' ? 'project-snippet' : 'snippet',
      boost: BOOST,
      apply: snippetFile
        ? snippet(snippetTemplate(preset.template))
        : applyPreset(preset),
    }))
  if (snippetFile) {
    options.push({
      label: '\\snippet',
      detail: 'New snippet',
      type: 'snippet',
      boost: BOOST + 1,
      apply: snippet(SNIPPET_SKELETON),
    })
  }

  return { from: word.from, options, validFor: /^\\[a-zA-Z]*$/ }
}

/** The editor side: adds the package lines in the snippet's own change */
export const snippetsWithPackagesExtension = (): Extension => addWithSnippet
