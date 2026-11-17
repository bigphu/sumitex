/**
 * The live "missing package" linter (guide Phase 3b; features list, 6).
 *
 * While you type, a command or environment whose package isn't loaded gets
 * a yellow underline: "\mathbb needs the amssymb package, which main.tex
 * doesn't load", with a fix, "Add \usepackage{amssymb}", and a link to the
 * package on CTAN. Ctrl+. (Cmd+. on a Mac) applies the fix at the cursor.
 *
 * - The open file is checked against its own preamble when it has one,
 *   otherwise against the main file's (diagnostics/preamble-store.ts), so
 *   a chapter is checked against main.tex.
 * - Commands you define yourself are never flagged, nor anything inside
 *   comments or verbatim and code listings.
 * - When the document's class may load packages SumiTeX can't see (a
 *   class it doesn't know, not in the project), the linter stays quiet.
 * - It follows the editor's "code check" setting, like the stock linter.
 */
import { Prec } from '@codemirror/state'
import { Command, EditorView, ViewPlugin, keymap } from '@codemirror/view'
import { Diagnostic, forEachDiagnostic, forceLinting } from '@codemirror/lint'
import { createLinter } from '@/features/source-editor/extensions/linting'
import {
  CLASSES,
  COMMANDS,
  ENVIRONMENTS,
  Provider,
  ctanUrl,
  withLoaded,
} from '../diagnostics/packages'
import {
  Preamble,
  parseFile,
  preambleOf,
  readPreamble,
  stripComments,
} from '../diagnostics/preamble'
import {
  getProjectPreamble,
  subscribeProjectPreamble,
  wasJustAdded,
} from '../diagnostics/preamble-store'
import { packageLoadAt, requestAddPackage } from './add-package'
import { codeOnly, escaped } from '../diagnostics/latex-text'

// Enough to be useful, few enough to stay readable
const MAX_DIAGNOSTICS = 100

function isLoaded(preamble: Preamble, provider: Provider) {
  return [provider.suggest, ...(provider.alsoFrom ?? [])].some(
    name => preamble.loaded.has(name) || wasJustAdded(name)
  )
}

function diagnostic(
  from: number,
  to: number,
  label: string,
  name: string,
  where: string | null
): Diagnostic {
  return {
    from,
    to,
    severity: 'warning',
    source: 'SumiTeX',
    message: where
      ? `${label} needs the ${name} package, which ${where} doesn't load.`
      : `${label} needs the ${name} package.`,
    actions: [
      {
        name: `Add \\usepackage{${name}}`,
        apply: () => requestAddPackage(name),
      },
      {
        name: `About ${name}`,
        apply: () => {
          window.open(ctanUrl(name), '_blank', 'noopener,noreferrer')
        },
      },
    ],
  }
}

/**
 * In a file with its own preamble: a command used above the \usepackage
 * that provides it (\usetikzlibrary above \usepackage{tikz}). Returns the
 * fix, or null when the package is loaded in time.
 */
function loadedTooLate(
  text: string,
  at: number,
  provider: Provider,
  documentClass: string | null
): Diagnostic['actions'] | null {
  const names = [provider.suggest, ...(provider.alsoFrom ?? [])]
  const before = withLoaded([
    ...parseFile(text.slice(0, at)).packages,
    ...((documentClass && CLASSES[documentClass]) || []),
  ])
  if (names.some(name => before.has(name))) return null
  const late = names.find(name => {
    const load = packageLoadAt(text, name)
    return load && load.from > at
  })
  if (!late) return null
  return [
    {
      name: `Move \\usepackage{${late}} up`,
      apply: () => {
        requestAddPackage(late, { usedAt: at })
      },
    },
  ]
}

function lint(view: EditorView): Diagnostic[] {
  const text = view.state.doc.toString()
  const store = getProjectPreamble()

  // This file's own preamble, or the main file's
  const ownPreamble = /\\documentclass/.test(stripComments(preambleOf(text)))
  const preamble = ownPreamble
    ? readPreamble(text, store.projectFiles)
    : store.preamble
  if (!preamble || !preamble.known) return []
  const where = ownPreamble ? null : store.mainName

  const preambleEnd = preambleOf(text).length
  const defined = new Set([...preamble.defined, ...parseFile(text).defined])
  const code = codeOnly(text)
  const found: Diagnostic[] = []

  for (const match of code.matchAll(/\\begin\s*\{([^}]+)\}/g)) {
    const env = match[1].trim()
    const provider = ENVIRONMENTS[env]
    if (!provider || defined.has(`env:${env}`) || isLoaded(preamble, provider)) {
      continue
    }
    const from = match.index! + match[0].indexOf('{') + 1
    found.push(
      diagnostic(from, from + match[1].length, `The ${env} environment`, provider.suggest, where)
    )
    if (found.length >= MAX_DIAGNOSTICS) return found
  }

  for (const match of code.matchAll(/\\([a-zA-Z]+)/g)) {
    const name = match[1]
    const provider = Object.prototype.hasOwnProperty.call(COMMANDS, name)
      ? COMMANDS[name]
      : undefined
    if (!provider || defined.has(name) || escaped(code, match.index!)) continue
    if (isLoaded(preamble, provider)) {
      // Loaded, but maybe only below this line of the preamble
      const fix =
        ownPreamble && match.index! < preambleEnd
          ? loadedTooLate(text, match.index!, provider, preamble.documentClass)
          : null
      if (fix) {
        const late = fix[0].name.match(/\{([^}]+)\}/)![1]
        found.push({
          from: match.index!,
          to: match.index! + match[0].length,
          severity: 'warning',
          source: 'SumiTeX',
          message: `\\${name} comes before \\usepackage{${late}}, so LaTeX doesn't know it yet.`,
          actions: fix,
        })
        if (found.length >= MAX_DIAGNOSTICS) break
      }
      continue
    }
    found.push(
      diagnostic(match.index!, match.index! + match[0].length, `\\${name}`, provider.suggest, where)
    )
    if (found.length >= MAX_DIAGNOSTICS) break
  }
  return found
}

/** Ctrl+.: apply the first fix of the problem at the cursor, or on its line */
export const applyQuickFix: Command = view => {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  type Hit = { d: Diagnostic; from: number; to: number }
  const hits: { cursor?: Hit; line?: Hit } = {}
  forEachDiagnostic(view.state, (d, from, to) => {
    if (!d.actions?.length) return
    if (!hits.cursor && from <= pos && pos <= to) hits.cursor = { d, from, to }
    if (!hits.line && from >= line.from && to <= line.to) {
      hits.line = { d, from, to }
    }
  })
  const hit = hits.cursor ?? hits.line
  if (!hit) return false
  hit.d.actions![0].apply(view, hit.from, hit.to)
  return true
}

// Check again when the main preamble changes (a package added, the
// snapshot refreshed), not only when this file changes
const relintOnPreambleChange = ViewPlugin.define(view => {
  const unsubscribe = subscribeProjectPreamble(() => forceLinting(view))
  return { destroy: unsubscribe }
})

export const missingPackageLinter = () => [
  createLinter(lint, { delay: 600 }),
  relintOnPreambleChange,
  Prec.high(keymap.of([{ key: 'Mod-.', run: applyQuickFix }])),
]
