/**
 * Helpers for project snippet files (.sxs; completions/project-snippets.ts):
 * the starter file, turning a selection into a snippet, and recognising a
 * snippet file.
 */
import { COMMANDS, ENVIRONMENTS } from '../diagnostics/packages'
import { codeOnly } from '../diagnostics/latex-text'
import { builtinMenuTriggers } from '../snippets/registry'

export const SNIPPET_FILE = 'snippets.sxs'

/** Opens (or creates) the project's snippets.sxs, from Settings */
export const OPEN_PROJECT_SNIPPETS_EVENT = 'sumitex:open-project-snippets'

/** A snippet file: by its name, or by its \snippet … \endsnippet lines */
export const isSnippetText = (text: string) =>
  /^[ \t]*\\endsnippet\b/m.test(text) ||
  /^[ \t]*\\(?:snippet|shortcut)\s*[[{]/m.test(text)

/** The built-in triggers, as comment lines of up to 72 characters */
function builtInTriggers() {
  const lines: string[] = []
  for (const trigger of builtinMenuTriggers()) {
    const lastLine = lines[lines.length - 1]
    if (lastLine && lastLine.length + trigger.length < 72) {
      lines[lines.length - 1] = `${lastLine} ${trigger}`
    } else lines.push(`% ${trigger}`)
  }
  return lines.join('\n')
}

/** What a new snippets.sxs starts with: how it works, and one example */
export const starterText = () => String.raw`% Snippets for this project, shared with everyone who works on it.
% Type a trigger (\mytab below) in any .tex file and pick it from the menu.
%
%   \snippet[options]{\trigger}{Label shown in the menu}[packages,it,needs]
%   ...the text, inserted as written. #{name} is a placeholder that Tab
%   moves to, #{} an empty one.
%   \endsnippet
%
%   \shortcut{trigger}{output}      one line, expands as you type in math
%
% Options: math or any (where it's offered; text is the default), auto
% (expands as you type) or tab (expands on Tab; the menu is the default).
% Sizes: in \snippet{\grid#{r:1-9}x#{c:1-9}}{Grid}, a body line
% \rows{r}{\cols{c}{#{}}} gives a row per r and a cell per c (\grid3x4).
% \lines{n}{...} repeats a line, \repeat{n}{...} a piece of text.
% \preamble{\newtheorem{lemma}{Lemma}} at the top of a body adds that line.
% The packages are added to the preamble when the snippet is used, unless
% they're loaded already. Reusing a built-in trigger replaces it in this
% project. Built-in ones:
${builtInTriggers()}
%
% Palette (Ctrl+Shift+P): "Snippets: New project snippet from selection"
% turns selected text into a snippet here.

\snippet{\mytab}{Results table}[booktabs]
\begin{table}[htbp]
  \centering
  \begin{tabular}{ll}
    \toprule
    #{Quantity} & #{Value} \\
    \midrule
    #{} &  \\
    \bottomrule
  \end{tabular}
  \caption{#{caption}}
  \label{tab:#{label}}
\end{table}
\endsnippet
`

/** The packages a piece of LaTeX needs, as far as SumiTeX knows */
export function packagesFor(text: string): string[] {
  const code = codeOnly(text)
  const names = new Set<string>()
  for (const match of code.matchAll(/\\begin\s*\{([^}]+)\}/g)) {
    const provider = ENVIRONMENTS[match[1].trim()]
    if (provider) names.add(provider.suggest)
  }
  for (const match of code.matchAll(/\\([A-Za-z]+)/g)) {
    const provider = COMMANDS[match[1]]
    if (provider) names.add(provider.suggest)
  }
  return [...names]
}

/** Text that CodeMirror's snippet() inserts exactly as it is */
export const literalForSnippet = (text: string) =>
  text.replace(/\\([{}])/g, '\\\\$1').replace(/([#$])\{/g, '$1\\{')

/**
 * A new snippet in a snippet file, from selected text: the trigger, label
 * and packages are placeholders to type over, and the text becomes the
 * body. For CodeMirror's snippet().
 */
export function newSnippetTemplate(selection: string): string {
  const env = selection.match(/\\begin\s*\{([A-Za-z]+)/)?.[1]
  const trigger = `\\my${env ?? 'snippet'}`
  const label = env ? `My ${env}` : 'My snippet'
  const packages = packagesFor(selection)
  const body = selection.trim()
    ? literalForSnippet(selection.replace(/\s+$/, ''))
    : '#{}'
  return [
    '',
    `\\snippet{#{${trigger}}}{#{${label}}}${packages.length ? `[#{${packages.join(',')}}]` : ''}`,
    body,
    '\\endsnippet',
    // The last Tab stop, so Tab never types into the header
    '#{}',
  ].join('\n')
}
