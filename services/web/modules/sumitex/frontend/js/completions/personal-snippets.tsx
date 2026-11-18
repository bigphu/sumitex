/**
 * Your personal snippets: the same \snippet … \endsnippet text as a
 * project's .sxs file, kept with your account (settings/account-prefs.ts)
 * and offered in every project you open. A project's own snippet with the
 * same trigger wins over yours, and yours over a built-in one.
 *
 * Edited in the snippet library (snippet-library.tsx; palette: "Snippets:
 * Open your snippets"), or on the account settings page
 * (settings/account-section.tsx).
 */
import { parseSnippetFile } from './project-snippets'

/** Opens the snippet library on your snippets */
export const OPEN_PERSONAL_SNIPPETS_EVENT = 'sumitex:open-personal-snippets'

export const PERSONAL_STARTER = String.raw`% Your snippets, offered in every project you open.
% Type a trigger in any .tex file and pick it from the menu.
%
%   \snippet{\trigger}{Label shown in the menu}[packages,it,needs]
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
% Type \snippet below for an empty one. A project's own snippet with the
% same trigger wins.
`

/** "3 snippets · 1 problem" */
export function snippetSummary(text: string) {
  const { presets, problems } = parseSnippetFile(text)
  const count = `${presets.length} snippet${presets.length === 1 ? '' : 's'}`
  return problems.length
    ? `${count} · ${problems.length} problem${problems.length === 1 ? '' : 's'}, underlined`
    : count
}
