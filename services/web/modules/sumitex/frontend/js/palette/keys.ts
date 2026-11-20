/**
 * Every keyboard shortcut SumiTeX shows, in one table: the palette's key
 * column, the shortcut sheet (Ctrl+K Ctrl+S) and button tooltips all read
 * from here, so a key is written down once.
 *
 * Keys are written with "Mod" for Ctrl (Cmd on a Mac) and "Alt" for Alt
 * (Option on a Mac); keyLabel() turns them into what the user reads.
 * Alternatives are separate strings: ['Mod+S', 'Mod+Enter'].
 */
import { isMac } from '@/shared/utils/os'
import { vscodeKeysOn } from '../editor/vscode-keymap'

/** What a key reads as on this machine: Mod+Shift+P → Ctrl+Shift+P. */
export const keyLabel = (key: string) =>
  key
    .replace(/Mod/g, isMac ? 'Cmd' : 'Ctrl')
    .replace(/Alt/g, isMac ? 'Option' : 'Alt')

/** Keys for the palette's commands, by command id */
export const COMMAND_KEYS: Record<string, string[]> = {
  compile: ['Mod+S'],
  'stop-compile': ['Shift+F5'],
  'change-layout-editor-only': ['Mod+1'],
  'change-layout-side-by-side': ['Mod+2'],
  'change-layout-pdf-only': ['Mod+3'],
  'change-layout-focus-mode': ['Mod+K Z'],
  'sumitex-toggle-zen-mode': ['Mod+K Z'],
  'sumitex-keyboard-shortcuts': ['Mod+K Mod+S'],
  'sumitex-toggle-equation-preview': ['Alt+P'],
  'sumitex-go-to-line': ['Ctrl+G'],
  'sumitex-toggle-problems': ['Mod+Shift+M'],
  'sumitex-open-outline': ['Mod+Shift+Y'],
  'sumitex-edit-block': ['Mod+K E'],
  'sumitex-insert-symbol': ['Mod+K M'],
  'sumitex-table-move-column-left': [isMac ? 'Ctrl+Alt+←' : 'Alt+←'],
  'sumitex-table-move-column-right': [isMac ? 'Ctrl+Alt+→' : 'Alt+→'],
  'open-settings': ['Mod+,'],
  show_version_history: ['Mod+Shift+H'],
  'synctex-sync-to-pdf': ['Mod+Alt+J'],
  comment: ['Mod+Shift+C'],
}

export type SheetRow = { label: string; keys: string[] }
export type SheetGroup = { title: string; rows: SheetRow[] }

/**
 * The shortcut sheet, grouped as in the mockup (frame 7), plus a short
 * Edit group with the stock keys people look up most (find, undo, bold,
 * case), so the sheet fits on a laptop screen. Alternatives for one row
 * share a chip: "Ctrl+S or Ctrl+Enter".
 */
export function sheetGroups(options: { review: boolean }): SheetGroup[] {
  const vscode = vscodeKeysOn()

  const navigate: SheetGroup = {
    title: 'Navigate',
    rows: [
      { label: 'Command palette, commands first', keys: ['Mod+Shift+P'] },
      { label: 'Quick open, files first', keys: ['Mod+P'] },
      { label: 'Go to section', keys: ['Mod+Shift+O'] },
      { label: 'Go to line', keys: [vscode ? 'Ctrl+G' : 'Mod+Shift+L'] },
    ],
  }

  const compile: SheetGroup = {
    title: 'Compile and problems',
    rows: [
      { label: 'Recompile', keys: ['Mod+S', 'Mod+Enter'] },
      { label: 'Stop', keys: ['Shift+F5'] },
      { label: 'Problems', keys: ['Mod+Shift+M'] },
      { label: 'Next / previous problem', keys: ['F8 / Shift+F8'] },
      { label: 'Show the cursor in the PDF', keys: ['Mod+Alt+J'] },
    ],
  }

  const edit: SheetGroup = {
    title: 'Edit',
    rows: [
      { label: 'Find and replace', keys: ['Mod+F'] },
      { label: 'Undo / redo', keys: ['Mod+Z / Mod+Y'] },
      { label: 'Bold / italic', keys: ['Mod+B / I'] },
      { label: 'Upper / lower case', keys: ['Ctrl+U / Ctrl+Shift+U'] },
      { label: 'Show / hide the equation preview', keys: ['Alt+P'] },
      // Without VS Code keys these two are the stock ones
      ...(vscode
        ? []
        : [
            { label: 'Toggle comment', keys: ['Mod+/'] },
            { label: 'Delete line', keys: ['Mod+D'] },
          ]),
    ],
  }

  const snippets: SheetGroup = {
    title: 'Snippets and autocomplete',
    rows: [
      { label: 'Suggest (also references in \\cite)', keys: ['Ctrl+Space'] },
      { label: 'Next / previous field', keys: ['Tab / Shift+Tab'] },
      { label: 'Leave the snippet', keys: ['Esc'] },
    ],
  }

  const review: SheetGroup = {
    title: 'Review',
    rows: [
      { label: 'Track changes', keys: ['Mod+Shift+A'] },
      { label: 'Add a comment', keys: ['Mod+Shift+C'] },
    ],
  }

  const layout: SheetGroup = {
    title: 'Layout',
    rows: [
      { label: 'Source only / Split / PDF only', keys: ['Mod+1 / 2 / 3'] },
      { label: 'Zen mode (Esc leaves)', keys: ['Mod+K Z'] },
      { label: 'In Zen: the PDF or the source', keys: ['Mod+\\'] },
      { label: 'Files', keys: ['Mod+Shift+E'] },
      { label: 'Outline', keys: ['Mod+Shift+Y'] },
      { label: 'Search project', keys: ['Mod+Shift+F'] },
      { label: 'History', keys: ['Mod+Shift+H'] },
      { label: 'Review', keys: ['Mod+J'] },
      { label: 'Settings', keys: ['Mod+,'] },
    ],
  }

  const vscodeEdit: SheetGroup = {
    title: 'Edit (VS Code)',
    rows: [
      { label: 'Move line (in a list: the whole item)', keys: ['Alt+↑ / ↓'] },
      { label: 'Edit the table, list, equation or section at the cursor', keys: ['Mod+K E'] },
      { label: 'Insert a symbol', keys: ['Mod+K M'] },
      {
        label: 'In a table: move the column',
        keys: [isMac ? 'Ctrl+Alt+← / →' : 'Alt+← / →'],
      },
      { label: 'Copy line', keys: ['Shift+Alt+↑ / ↓'] },
      { label: 'Delete line', keys: ['Mod+Shift+K'] },
      { label: 'Select line', keys: ['Mod+L'] },
      { label: 'Toggle comment', keys: ['Mod+/'] },
      { label: 'Jump to matching bracket', keys: ['Mod+Shift+\\'] },
      { label: 'Select all matches', keys: ['Mod+Shift+L'] },
      { label: 'Add the next match / skip it', keys: ['Mod+D', 'Mod+K Mod+D'] },
      { label: 'Add a cursor / select a column', keys: ['Alt+click', 'Shift+Alt+drag'] },
      { label: 'Grow / shrink the selection', keys: ['Shift+Alt+→ / ←'] },
      { label: 'Fold / unfold all', keys: ['Mod+K Mod+O / J'] },
    ],
  }

  // Read top to bottom; the sheet's index lists them in this order
  return [
    navigate,
    layout,
    compile,
    edit,
    ...(vscode ? [vscodeEdit] : []),
    snippets,
    ...(options.review ? [review] : []),
  ]
}
