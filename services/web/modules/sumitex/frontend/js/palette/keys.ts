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
  'sumitex-trim-trailing-whitespace': ['Mod+K Mod+X'],
  'open-settings': ['Mod+,'],
  show_version_history: ['Mod+Shift+H'],
  'synctex-sync-to-pdf': ['Mod+Alt+J'],
  comment: ['Mod+Shift+C'],
}

/** Keys that open the side panels, by rail or strip key (hover tips) */
export const PANEL_KEYS: Record<string, string> = {
  'file-tree': 'Mod+Shift+E',
  'full-project-search': 'Mod+Shift+F',
  'sumitex-outline': 'Mod+Shift+Y',
  'sumitex-history': 'Mod+Shift+H',
  'review-panel': 'Mod+J',
  settings: 'Mod+,',
}

export type SheetRow = { label: string; keys: string[] }
export type SheetGroup = { title: string; rows: SheetRow[] }

/**
 * The shortcut sheet, grouped by what you're doing, as VS Code groups its
 * keys: Navigate, Layout, Compile, Edit (always there), then Lines,
 * Cursors and selection, and Folding (VS Code keys, when they're on),
 * Blocks (SumiTeX's own), Snippets and Review. Alternatives for one row
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

  // Always there (Overleaf's and CodeMirror's own keys)
  const edit: SheetGroup = {
    title: 'Edit',
    rows: [
      { label: 'Find (and replace)', keys: ['Mod+F'] },
      ...(vscode
        ? [
            {
              label: 'Find and replace, in the Replace field',
              keys: [isMac ? 'Mod+Alt+F' : 'Mod+H'],
            },
          ]
        : []),
      { label: 'Undo / redo', keys: ['Mod+Z / Mod+Y'] },
      { label: 'Bold / italic', keys: ['Mod+B / I'] },
      { label: 'Upper / lower case', keys: ['Ctrl+U / Ctrl+Shift+U'] },
      { label: 'Indent / outdent', keys: ['Mod+] / Mod+[', 'Tab / Shift+Tab'] },
      { label: 'Toggle comment', keys: ['Mod+/'] },
      { label: 'Show / hide the equation preview', keys: ['Alt+P'] },
      // Without VS Code keys this is the stock one
      ...(vscode ? [] : [{ label: 'Delete line', keys: ['Mod+D'] }]),
    ],
  }

  // Lines, the way VS Code moves them
  const lines: SheetGroup = {
    title: 'Lines',
    rows: [
      { label: 'Move line (in a list: the whole item)', keys: ['Alt+↑ / ↓'] },
      { label: 'Copy line up / down', keys: ['Shift+Alt+↑ / ↓'] },
      { label: 'Delete line', keys: ['Mod+Shift+K'] },
      { label: 'Select line (again: the next one too)', keys: ['Mod+L'] },
      { label: 'Comment / uncomment lines', keys: ['Mod+K Mod+C / Mod+K Mod+U'] },
      { label: 'Trim spaces at the ends of lines', keys: ['Mod+K Mod+X'] },
    ],
  }

  const cursors: SheetGroup = {
    title: 'Cursors and selection',
    rows: [
      { label: 'Add the next match / skip it', keys: ['Mod+D', 'Mod+K Mod+D'] },
      { label: 'Select all matches', keys: ['Mod+Shift+L', 'Mod+F2'] },
      {
        label: 'Add a cursor above / below',
        keys: [isMac ? 'Cmd+Alt+↑ / ↓' : 'Ctrl+Alt+↑ / ↓'],
      },
      { label: 'A cursor at the end of each selected line', keys: ['Shift+Alt+I'] },
      { label: 'Add a cursor / select a column', keys: ['Alt+click', 'Shift+Alt+drag'] },
      { label: 'Undo the last cursor move', keys: ['Mod+U'] },
      { label: 'Grow / shrink the selection', keys: ['Shift+Alt+→ / ←'] },
      { label: 'Jump to the matching bracket', keys: ['Mod+Shift+\\'] },
    ],
  }

  const folding: SheetGroup = {
    title: 'Folding',
    rows: [
      {
        label: 'Fold / unfold here',
        keys: [isMac ? 'Mod+Alt+[ / ]' : 'Mod+Shift+[ / ]', 'F2'],
      },
      { label: 'Fold / unfold all', keys: ['Mod+K Mod+0 / Mod+K Mod+J'] },
    ],
  }

  // Not VS Code's: SumiTeX's own, always on
  const blocks: SheetGroup = {
    title: 'Blocks',
    rows: [
      { label: 'Edit the table, list, equation or section at the cursor', keys: ['Mod+K E'] },
      { label: 'Insert a symbol', keys: ['Mod+K M'] },
      ...(vscode
        ? [
            {
              label: 'In a table: move the column',
              keys: [isMac ? 'Ctrl+Alt+← / →' : 'Alt+← / →'],
            },
          ]
        : []),
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

  // Read top to bottom; the sheet's index lists them in this order
  return [
    navigate,
    layout,
    compile,
    edit,
    // VS Code's keys for lines, cursors and folding (Settings: VS Code keys)
    ...(vscode ? [lines, cursors, folding] : []),
    blocks,
    snippets,
    ...(options.review ? [review] : []),
  ]
}
