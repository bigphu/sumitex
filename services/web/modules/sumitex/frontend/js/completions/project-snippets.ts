/**
 * Snippets of a project's own, from its .sxs files (snippets.sxs), shared
 * with collaborators and kept in history like any other file.
 *
 *   % Comments and blank lines between snippets are ignored
 *   \snippet{\mytab}{Results table}[booktabs,siunitx]
 *   \begin{table}[htbp]
 *     #{Quantity} & #{Value} \\
 *   \end{table}
 *   \endsnippet
 *
 *   \snippet[math]{\nrm}{Norm}
 *   \left\lVert #{} \right\rVert
 *   \endsnippet
 *
 * - The header line: an optional [math] (offered only inside math; [text],
 *   the default, only outside it), the trigger, the label, and optional
 *   packages, comma-separated.
 * - The body is inserted as written. #{name} is a placeholder, #{} an empty
 *   one; nothing else is special, so \{, $ and % stay as they are.
 * - A project snippet replaces a built-in one with the same trigger.
 */
import type { Preset, PresetContext } from './presets'

const HEADER =
  /^\s*\\snippet\s*(?:\[\s*(text|math)\s*\])?\s*\{\s*(\\[A-Za-z]+)\s*\}\s*\{([^}]*)\}\s*(?:\[([^\]]*)\])?\s*(?:%.*)?$/
const END = /^\s*\\endsnippet\s*(?:%.*)?$/

export type SnippetFileProblem = { line: number; message: string }

export function parseSnippetFile(text: string): {
  presets: Preset[]
  /** The line (1-based) of each preset's \snippet header */
  lines: number[]
  problems: SnippetFileProblem[]
} {
  const presets: Preset[] = []
  const headerLines: number[] = []
  const problems: SnippetFileProblem[] = []
  const lines = text.split(/\r\n?|\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!/^\s*\\snippet\b/.test(line)) continue
    const header = line.match(HEADER)
    if (!header) {
      problems.push({
        line: i + 1,
        message: 'Expected \\snippet{\\trigger}{Label}[packages]',
      })
      continue
    }
    const start = i
    const body: string[] = []
    for (i++; i < lines.length && !END.test(lines[i]); i++) body.push(lines[i])
    if (i >= lines.length) {
      problems.push({ line: start + 1, message: 'No \\endsnippet after this' })
      break
    }
    const [, context, trigger, label, packages] = header
    headerLines.push(start + 1)
    presets.push({
      trigger,
      label: label.trim() || trigger,
      category: 'project',
      context: (context as PresetContext | undefined) ?? 'text',
      packages: (packages ?? '')
        .split(',')
        .map(name => name.trim())
        .filter(Boolean),
      template: body.join('\n'),
    })
  }
  return { presets, lines: headerLines, problems }
}

const caches = new Map<string, { text: string; presets: Preset[] }>()

function parsed(key: string, text: string, category: Preset['category']) {
  const cached = caches.get(key)
  if (cached?.text === text) return cached.presets
  const presets = parseSnippetFile(text).presets.map(preset => ({
    ...preset,
    category,
  }))
  caches.set(key, { text, presets })
  return presets
}

/** The project's presets, parsed once per change of the files */
export const projectPresets = (text: string | null): Preset[] =>
  text ? parsed('project', text, 'project') : []

/** Your personal presets (Settings, kept with your account) */
export const personalPresets = (text: string): Preset[] =>
  text ? parsed('personal', text, 'personal') : []
