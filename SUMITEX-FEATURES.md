# SumiTeX — Agreed Features

_Last updated: 16 Nov 2026 (Phase 1 done; synced with the design doc, roadmap and Build Guide) · branch `zen-shell` · base: AyakaLeaf Pro (AGPL-3.0)_

SumiTeX is a self-hosted LaTeX editor with a calm, minimalist interface, built as a fork of AyakaLeaf Pro. It runs locally first and on a VPS later.

This file lists every feature agreed so far: what it does, how it behaves, what's tricky and how it's built. Related documents:
- **[Software design document](https://claude.ai/artifact/PsxQCmzRWnZWmSBmRmRJNR):** priorities, architecture, security and the full list of tiers.
- **[UI mockup](https://claude.ai/artifact/Kx8PqyQTSJpgtaSjGJixmW):** every screen, from the default view to the edit pop-ups.
- **[Roadmap whiteboard](https://claude.ai/artifact/DNmEjYxj6KhibYYM82Vs1j):** the phases and their gates.
- **[SumiTeX Build Guide](https://claude.ai/artifact/9o8ZBvLhzaC8w4LhEsQWkh):** step-by-step build instructions with code sketches.

> **Status (16 Nov 2026):** features 1 and 2, persistent editor state and the installable app are built (Build Guide Phase 1, committed on `zen-shell`); the command palette is switched on; the compile output rework (feature 6) has started with the log as a bottom panel. Everything else is still to build. File paths were checked against the code. Sizes are rough guesses. Trigger names and preset lists are suggestions you can change.

---

## Decisions

| Topic | Decision |
|---|---|
| Route | Fork AyakaLeaf Pro. Don't build a new editor from scratch. |
| Licence | AGPL-3.0. Anyone using your server must be offered the changed source (public `sumitex` repo + "Source code" link in the footer). Never bypass Overleaf Server Pro's licence. |
| Name | SumiTeX |
| Default view | Minimalist IDE layout in the JetBrains "Islands" style: thin strips on a dark frame around rounded panels, one side panel at a time on each side. Zen mode is optional. |
| Stock features | Nothing Overleaf or AyakaLeaf offers is removed: stock parts are restyled, moved or hidden behind a setting, and every command stays in the palette (see "Stock features in the new layout" under feature 1). |
| Interface rule | Quiet by default: controls show on hover, selection or in a pop-up; no panel opens by itself; every action is in the command palette. |
| Where code lives | One module, `services/web/modules/sumitex/`, plugged in through the existing module slots, plus a few small upstream edits marked `// SumiTeX` |
| Dev environment | `~/sumitex/develop` in WSL, lean `dev.rc` (extras off), live reload with `bin/dev web webpack` |
| Git | Work on `zen-shell`. No Claude attribution in commits; `.claude/` and `CLAUDE.md` stay out of git. |

---

## Feature overview

| # | Feature | Status in the code today | Size |
|---|---|---|---|
| 1 | Minimalist IDE layout | **Done** 16 Nov 2026 | Medium |
| 2 | Zen focus mode | **Done** 15 Nov 2026 | Small–medium |
| 3 | VS Code keyboard shortcuts | **Done** 16 Nov 2026 (Phase 2) | Small |
| 4 | Command palette | **Done** 16 Nov 2026 (Phase 2); `@` blocks come with feature 11 | Small |
| 5 | Project folders: nested folders on the dashboard, plus polish for folders inside a project | Dashboard folders done (v0.5.0, 18 Nov 2026); folders inside a project already work, polish still to do | About 1 week (dashboard) + small polish |
| 6 | Better linter and compile output | Started: the log is a bottom panel (Problems with filters, Log with folds and search); linter and plain-language rules still to do | Medium |
| 7 | Snippets that bring their packages | Partial: snippet completions exist | Medium |
| 8 | Math auto-expansion | New | Medium |
| 9 | Draggable lists | Partial: Visual-mode list markers exist | Large |
| 10 | Draggable table columns | Partial: Visual-mode table generator exists | Large |
| 11 | Outline with blocks (sections plus figures, tables, lists, equations…; blocks can be toggled off) | Partial: section outline exists under the file tree | Small–medium (v1) → Large (all versions) |
| 12 | Notion-like preview editing | Partial: Visual editor exists | Large, **deferred** |

---

## 1 · Minimalist IDE layout (default)

**What you see.** The document fills the window. Following JetBrains' "Islands" UI (decided 14 Nov 2026), the bars sit on a dark frame and the side panel, editor and PDF are rounded islands with small gaps between them. The [UI mockup](https://claude.ai/artifact/Kx8PqyQTSJpgtaSjGJixmW) draws every screen.

| Area | What it holds |
|---|---|
| Title bar (40 px) | Ensō main menu (every stock File, View, Edit, Insert and Help action), project name, search box (Ctrl+P), run widget, Share with collaborator avatars |
| Left strip (48 px) | Files, Outline, Search, History, Integrations (only when one is on); Settings at the bottom |
| Right strip (44 px) | Review, Chat, AI assistant (only when AI is on); Notifications at the bottom. These panels open on the right |
| Editor and PDF island | One island for both (decided 14 Nov 2026), as JetBrains does for Markdown preview, so the tab row spans the full width. Its right end holds the Code / Visual switch and the Source / Split / PDF switch. Inside: folding, a problem widget (counts, F8 / Shift+F8), an overview ruler, review comments as author tags at line ends, and the PDF behind a thin divider with one floating bar (page, zoom, jump to cursor, download) |
| Status bar (24 px) | Path (project › folder › file › chapter › section; the last item opens a section jump menu), position, word count, save state |

| View | What is on screen | Shortcut |
|---|---|---|
| Split (default) | Side panel, source and PDF | Ctrl+2 |
| Source only | Side panel and source | Ctrl+1 |
| PDF only | Large PDF; double-click opens a source peek; review comments in the margin | Ctrl+3 |
| Zen | See feature 2 | Ctrl+K Z |
| Narrow window (below ~900 px) | Source or PDF, never split; the side panel opens as a drawer | Automatic |

**Run widget** (in the title bar)
- **Profile name:** opens the compile menu. Profiles are Full build, Draft, and Current chapter only (through `\includeonly`). The menu also has recompile, recompile from scratch, stop, auto-compile when idle, stop on first error, syntax check, compiler, TeX Live version and main document.
- **▶ button:** icon-only, recompiles (Ctrl+S or Ctrl+Enter). It shows a spinner while compiling, turns into a red stop square on hover, and carries a small dot for the last result: ochre for warnings, red for errors.

**Quiet by default:** problem text at the end of a line shows only on the cursor line (errors always); elsewhere a gutter dot is enough.

**Acceptance:** a fresh sign-in opens Split view with the Files panel; every panel and view opens and closes by keyboard; screenshots at laptop and narrow widths are in the smoke suite.

**How it's built**
- **Styles:** a SumiTeX stylesheet `frontend/stylesheets/pages/editor/sumitex.scss`, imported last from `pages/all.scss`. Change the existing colour/spacing tokens rather than single elements.
- **Hiding buttons:** toolbar items such as online users and the upgrade prompt are hidden behind a SumiTeX setting in `ide-react/components/toolbar/toolbar.tsx`, not deleted.
- **Name:** the site is renamed with `APP_NAME=SumiTeX`. Reword the footer trademark notice (`app/views/layout/thin-footer.pug`) to say SumiTeX is derived from Overleaf.

### Installed app (P0, decided 14 Nov 2026)

In a browser tab, the tab strip and address bar take 80–100 px. Installed as an app, SumiTeX gets its own window without them.
- **Already there:** `services/web/public/web.sitemanifest.json` (linked from `app/views/_metadata.pug`) has `display: standalone`, so installing works today. It's still named Overleaf, with one SVG icon.
- **Work:**
  - Rebrand the manifest: name SumiTeX, `start_url` the project list, an `id`, SumiTeX colours, and PNG icons at 192 and 512 px plus a maskable one.
  - Add `display_override: ["window-controls-overlay"]`. Our 40 px title bar then becomes the window's title bar, next to the window buttons: it uses the `env(titlebar-area-*)` CSS values, its empty space drags the window, and its buttons don't.
  - Add "Install SumiTeX" to main menu › File when the browser allows it.
- **Limits:** installing needs HTTPS (localhost counts). Firefox doesn't install web apps, so there it stays a normal tab.
- **Not adopted for now:** compact mode (no title bar), fullscreen Zen and browser-safe shortcut alternatives.

### Stock features in the new layout

Nothing is removed. Every stock command also stays in the palette.

| Stock feature | Where it lives |
|---|---|
| File tree, outline, project search, history | Left strip panels |
| Integrations (Git bridge, GitHub/GitLab/Gitea sync, Dropbox, Zotero, Mendeley, MCP) | Left strip, shown when one is on |
| Settings | Bottom of the left strip; compile items also in the run widget |
| Review and track changes, chat | Right strip panels |
| AI assistant (AyakaLeaf workbench) | Right strip, shown when AI is on; error-assistant Fix buttons stay on problem entries |
| Code / Visual (rich-text) editor | Switch in the editor's tab bar; main menu › View |
| Formatting toolbar | Main menu › Insert and the palette; Ctrl+B / Ctrl+I later (P2) |
| Make a copy, download source and PDF, export DOCX / Markdown / HTML | Main menu › File |
| Detached PDF, presentation mode | Main menu › View and the palette |
| Keyboard shortcuts, dictionary, contact, labs | Main menu › Help; shortcut sheet on Ctrl+K Ctrl+S |
| Compile, logs, SyncTeX, share, word count | Run widget and Problems panel; PDF bar; title bar; status bar |
| Python runner (AyakaLeaf) | Not placed yet (open question) |

**Smoke checks:** every stock action is reachable from the palette; every stock panel opens from a strip or the main menu; slots used by stock add-ons (such as the error assistant's log button) still render.

**Persistent editor state** (P0, from the design doc): reopening a project brings back where you left off, with a "Back where you left off" toast. **Done** 16 Nov 2026: open file, cursor, PDF position and expanded folders.

**Built (Phase 1, 16 Nov 2026):** the islands frame and tokens, title bar with the ensō menu and run widget (Full build, Draft, Current chapter only), left and right strips, the editor-and-PDF tab bar, PDF pill, problems widget, compile log as a bottom panel, status bar, narrow-window drawer, Track changes switch, and the installable app. Light and dark themes both checked. A polishing pass added the **Notifications bell** at the foot of the right strip (your invitations and Dropbox notices, with Join and Dismiss) and **Accept / "Hide accepted"** for warnings in the Problems panel.

## 2 · Zen focus mode (optional)

**What you see.** Ctrl+K Z (or the palette) hides all chrome:
- **Text column:** centred, about 72 characters wide.
- **Gutters:** no line numbers; problem dots stay.
- **Typewriter scrolling:** the cursor line stays in the middle of the screen.

Esc or the exit button brings back the normal layout.

**How it's built**
- **Base:** turn on the existing focus mode by adding `'focus-mode': 'enabled'` to `splitTestOverrides` in `config/settings.defaults.js`. It already strips the toolbar and remembers the choice per browser.
- **Extras:** the Zen additions live in a CodeMirror _compartment_ that a small "bridge" React component switches on and off as `focusMode` changes.

**Check while building:** that hiding gutters doesn't hide lint markers you want to keep.

## 3 · VS Code keyboard shortcuts

**Done 16 Nov 2026** (Build Guide Phase 2, branch `phase-2-vscode-keys`).

**The pattern (decided 16 Nov 2026).** Ctrl for the text, Ctrl+Shift for places outside the editor, Ctrl + digit for the view, Ctrl+Alt for compile and the PDF, Ctrl+K for modes and rare actions. Cmd instead of Ctrl on a Mac.

| Keys | Action |
|---|---|
| Ctrl+P / Ctrl+Shift+P / Ctrl+Shift+O | Palette: files first / commands / sections |
| Ctrl+1 / 2 / 3 | Source only / Split / PDF only |
| Ctrl+Shift+E / F / H / M | Files / project search / History / Problems and the log |
| Ctrl+J, Ctrl+, | Review (Overleaf's), Settings |
| Ctrl+Alt+B, Ctrl+Alt+J, Shift+F5 | Compile, show the cursor in the PDF, stop |
| Ctrl+K Z, Ctrl+K Ctrl+S | Zen mode, the shortcut sheet |
| Alt+↑/↓, Shift+Alt+↑/↓, Ctrl+Shift+K | Move, copy, delete line (CodeMirror's defaults) |
| Ctrl+L, Ctrl+Shift+L | Select line (again: the next one too), select all matches |
| Ctrl+D, Ctrl+K Ctrl+D | Add the next match, skip it |
| Ctrl+G | Go to line (was Ctrl+Shift+L) |
| Shift+Alt+→ / ← | Grow / shrink the selection |
| Ctrl+K Ctrl+O / J | Fold / unfold all |
| F8 / Shift+F8 | Next / previous problem |
| Alt+click, Shift+Alt+drag | Add a cursor, select a column |

**Rules as built**
- **Kept from Overleaf:** Ctrl+S and Ctrl+Enter compile, Ctrl+B bold, Ctrl+U uppercase, Ctrl+J Review. Ctrl+D (delete line) moved to Ctrl+Shift+K, and Overleaf's Ctrl+Shift+M focus mode gave way to Problems; Zen is Ctrl+K Z.
- **Editor keys** live in one `Prec.highest` keymap (`editor/vscode-keymap.ts`) and step aside when Vim or Emacs keys are on.
- **Page keys** (`layout/use-global-shortcuts.ts`) work wherever the focus is. Ctrl+K Z, Ctrl+K Ctrl+S, Ctrl+G and F8 also work outside the editor; inside it the editor's keymaps answer.
- **One table of keys** (`palette/keys.ts`) feeds the palette's key column, the shortcut sheet and tooltips.
- **Shortcut sheet** (Ctrl+K Ctrl+S, Help › Keyboard shortcuts): every key, Overleaf's included, in groups with an index on the left (the group being read is set in on a darker block) and a filter box. It replaces the stock sheet while the `sumitex-title-bar` flag is on.
- **Still to come:** Alt+↑/↓ on an `\item` moves the whole item (feature 9); F12 go to label and Ctrl+. quick fix come with go to definition and feature 6.

## 4 · Command palette

**Done 16 Nov 2026** (Phase 2). Centred in the window, as in the mockup (frames 2 and 17): a search box with prefix chips under it (`@` sections, `#` labels, `:` line, `>` commands), group headings, the typed words highlighted, and keys or `file:line` on the right.

| Mode | Nothing typed | Typing |
|---|---|---|
| Ctrl+P (files) | Recent files, recently used commands, a few suggested ones | Files first, then commands |
| Ctrl+Shift+P (`>`) | Recently used, Suggested (the mockup's list), then every command | Commands; recently used ones rank higher |
| Ctrl+Shift+O (`@`) | The open file's sections, indented by level | Matching sections |
| `#` | The open file's labels, with what they label | Matching labels |
| `:` | A hint with the file's line count | Jump to the line (`:42,5` for a column) |

**How it's built.** The stock palette with a few marked lines: the trigger chooses the mode, the body renders `palette/palette-row.tsx`, the result type gains an optional `sumitex` field (group, glyph, location), and SumiTeX sources add sections, labels, recent files and the line hint. Every `sumitex-*` command joins the list without being named in `use-command-registry-source.tsx`. Blocks under `@` (for example `@fig pipe`) come with the Outline (feature 11).

**Dialogs (done with Phase 2).** The stock `themed-modals` flag is on, so most dialogs follow the theme, and every themed dialog shares one SumiTeX surface and scrollbar (`shell/_dialogs.scss`). Settings uses the sheet's look: an index on the left, small-capital headings, rows on hairlines.

### The Settings dialog, by task (decided 17 Nov 2026)

The dialog's tabs follow what you're doing, not where a setting came from (`settings/settings-tabs.tsx`, through a `settingsModalTabs` slot):

| Tab | Holds |
|---|---|
| Editor | **Typing:** auto-complete, auto-close brackets, floating menu. **Display:** editor tabs, preview tabs, breadcrumbs, equation preview, non-blinking cursor, Code-mode toolbar, PDF viewer |
| Snippets & shortcuts | **Snippets:** yours (Edit… opens the dialog) and the project's (Open, or Create… for `snippets.sxs`). **Math shortcuts:** the switch and your rules, with the built-in list. **Keys:** keybindings (Vim, Emacs) and the shortcut sheet |
| Checks | **While you type:** code check, missing packages, project checks (the last two need the code check, and switching them re-checks at once) |
| Spelling, Compiler, References, Appearance, Notifications | As in Overleaf |

- **Filter** (`settings/use-settings-filter.tsx`, `settingsModalFilter` slot): a box above the tabs, like the shortcut sheet's. Typing lists the matching settings from every tab under the tab's name (tab and section names count, so "checks" lists the Checks tab); Esc clears it, picking a tab leaves it.
- **Nothing lost:** an Editor setting the layout doesn't place (from another module or a later Overleaf) stays in Editor, in its own section.
- **Upstream edits, marked `// SumiTeX`:** the two slots in `ide-settings/context/settings-modal-context.tsx` and `ide-settings/components/settings-modal-body.tsx`.

## 5 · Project folders

There are two kinds of folders. The design doc's main feature is the first.

**Folders on the dashboard (new, P1, about 1 week).** Group LaTeX projects into nested folders on the project list.
- **Data model:** folders are nested per-user tags. AyakaLeaf keeps upstream's tags (`app/src/models/Tag.mjs` stores a name and a colour), shown in the dashboard sidebar (`features/project-list/components/sidebar/tags-list.tsx`). Add an optional `parentId` so a tag can sit inside another. No project data is migrated.
- **Behaviour:** a collapsible folder tree under All / Your projects / Shared / Archived / Trashed. Drag a project onto a folder to add it, and drag a folder to move it. A project can sit in several folders, and each user keeps their own folders.
- **Rules:** reject cycles, cap the depth (proposed: 5), and when a folder is deleted, move its children up a level.
- **Rollback:** old tags have no parent, so they show as top-level folders, and stock Overleaf still reads the data.

**Folders inside a project (exists, polish only).** The file tree already supports folders inside folders, a "New folder" command, drag-and-drop and a breadcrumb path. Polish:
- "Reveal in file tree" when switching files.
- Collapse all / expand all buttons.
- `\includegraphics` path suggestions relative to the main file.

## 6 · Better linter and compile output

**What you see**
- **While typing:** a yellow underline on `\includegraphics` when graphicx isn't loaded, with a button **Add `\usepackage{graphicx}`**.
- **After compiling:** each error gets a plain-language explanation and a docs link. Where the fix is a missing package, the error has an **Add package** button.

**How it's built**
- **Live linter:** a linter that reuses the editor's `createLinter` helper, so the syntax-check setting turns it off too, and the existing command→package map (`HumanReadableLogsPackageSuggestions.ts`).
- **Explanations:** written as rules + hints in `frontend/js/ide/human-readable-logs/`.
- **Button on log entries:** plugged into the `pdfLogEntryHeaderActionComponents` slot, the same way the error-assistant's fix button is.
- **Compile output (design doc):** first error first, with a note that later errors often follow from it. Entries are grouped by file and duplicates collapsed, the raw log is one click away, and links go to the package page on CTAN or texdoc. Rules live in a data file, and unmatched errors are logged to choose the next rules. The existing AI error assistant handles only errors no rule matches.
- **More checks (design doc):** ChkTeX inside the compile sandbox with a curated rule set (a project can override it with `.chktexrc`), plus client-side checks: undefined or duplicate labels, undefined citations, duplicate `.bib` keys, unmatched `\begin`/`\end`, and missing files.
- **Hover:** a `\usepackage` line or a command shows a short description with CTAN and documentation links.

**Tricky cases**
- **Multi-file projects.** The preamble may be in `main.tex` while you edit `chapter1.tex`. Version 1 only checks files with their own `\documentclass`; version 2 uses project-wide data.
- **Wrong file open.** The fix button must insert into the main file, not whatever file is open.
- **Docs home.** Docs links need a home of your own; the current links go to Overleaf's Learn wiki.

## 7 · Snippets that bring their packages

**What you see.** Type `\fig` → "Figure with image (adds graphicx)". Enter inserts a full figure block with the cursor in the file name. Tab moves to the caption, then the label. If graphicx isn't loaded, `\usepackage{graphicx}` is added at the same moment.

**How it behaves**
- **Placeholders:** Tab / Shift+Tab move between them, and Esc leaves the snippet.
- **Package line:** goes after the last `\usepackage`, or before `\begin{document}` if there's none.
- **No duplicates:** nothing is added if the package is already loaded, including when it sits in a list such as `\usepackage{amsmath,graphicx}`.
- **Undo:** one Ctrl+Z should remove both the snippet and the package line. Test this.
- **Templates:** whole-file starters use the same preset data, through the palette's "New file from template".

**How it's built.** A completion source in the `sourceEditorCompletionSources` slot. Presets are kept in a data file. It shares the "add package" helper with feature 6.

**Built (Phase 4, 17 Nov 2026):** 19 presets from the catalogue below (`completions/presets.ts`): `\fig` `\subfig` `\herefig`, `\table` `\booktab` `\widetab`, `\ilist` `\elist` `\alist`, `\eq` `\align` `\cases` `\bmat`, `\thm` `\proof`, `\cref`, `\code` `\algo` `\tikzpic`. The menu says what a snippet will add ("Clean table with rules · adds booktabs"), and nothing that is already loaded. In a file with its own preamble, one Ctrl+Z takes back the snippet and its package lines. In a chapter, the packages go into the main file in one visit, then the snippet goes in; undo is then per file.

### Project snippets (decided 17 Nov 2026)

A project can have snippets of its own in `.sxs` files (for example `snippets.sxs`). They are shared with collaborators, kept in history and synced like any file. They sit with the built-in ones in the menu, and replace a built-in one with the same trigger.

```latex
% snippets.sxs
\snippet{\mytab}{Results table}[booktabs,siunitx]
\begin{table}[htbp]
  #{Quantity} & #{Value} \\
\end{table}
\endsnippet

\snippet[math]{\nrm}{Norm}
\left\lVert #{} \right\rVert
\endsnippet
```

- **Header:** `\snippet[math]{\trigger}{Label}[packages]`. `[math]` offers it only inside math (the default, `[text]`, only outside); the packages are comma-separated.
- **Body:** inserted as written. `#{name}` is a placeholder and `#{}` an empty one; nothing else is special, so `\{`, `$` and `%` stay as they are.
- **Files:** `.sxs` is a text type (`textExtensions`) highlighted as LaTeX. The stock syntax check skips these files (they hold fragments), and labels in them don't count in the project checks.
- **Palette:** "Snippets: Open project snippets" opens `snippets.sxs`, creating it with a short guide, the list of built-in triggers and an example. "Snippets: New snippet from selection" adds the selected text to it as a new snippet, with the trigger, label and packages (guessed from the text) as placeholders to type over.
- **In the file:** typing `\snippet` inserts an empty snippet to fill in; other snippets go in as plain text and add no packages. Problems show as you type: a header SumiTeX can't read, a missing `\endsnippet`, a trigger used twice, and a note where a snippet replaces a built-in one.
- **In the menu:** project snippets carry a `project-snippet` tag.
- **Later:** preamble lines (`\newtheorem`) for project snippets.

### Personal snippets (decided 17 Nov 2026)

Your own snippets, in the same `\snippet … \endsnippet` text, offered in every project you open and kept with your account (`user.ace.sumitexSnippets`, saved through `/user/settings`), so they follow you to any device. A project's snippet with the same trigger wins over yours, and yours over a built-in one. In the menu they carry a `personal-snippet` tag.

- **Palette:** "Snippets: Open your snippets (every project)" opens a dialog with a small editor (LaTeX highlighting, `\snippet` for a new one, Tab between placeholders, problems underlined as you type). "Snippets: New personal snippet from selection" opens it with the selection added as a new snippet. The project commands are now "Open project snippets" and "New project snippet from selection".
- **Account settings** (`/user/settings`, no project needed): a "Snippets and math shortcuts" section with the same snippet editor and the math shortcuts box, through a new `settingsPageSections` module slot. The editor's Settings → SumiTeX has a "Your snippets" row linking there.
- **The snippet editor** (`completions/snippet-editor.tsx`, shared by the dialog and the account page): LaTeX in SumiTeX's colours, `#{…}` placeholders as pills, each `\snippet` header on a band, and the problems underlined.
- **Math shortcuts** moved to the account as well (`user.ace.sumitexMathRules`); rules kept in a browser before are moved over on the first visit. The on/off switch stays per browser.
- **Upstream edits, each marked `// SumiTeX`:** two fields in `User.mjs`, accepting them in `UserController.mjs` (64 KB and 16 KB at most), sending them to the editor (`UserSettingsHelper.mjs`) and to the account page (`UserPagesController.mjs`, `user/settings.pug`, `meta.ts`), and the `settingsPageSections` slot (`features/settings/components/root.tsx`, `settings.defaults.js`).

### Preset catalogue

**Document starters** (palette → New file from template)

| Template | What you get | Packages |
|---|---|---|
| Article | title, author, abstract, sections, bibliography | geometry, amsmath, graphicx, hyperref |
| Report / thesis | chapters, front matter, appendix | geometry, graphicx, amsmath, hyperref, cleveref |
| Book | parts, chapters, front/main/back matter | graphicx, hyperref |
| Homework / problem set | header, numbered problems, solution blocks | amsmath, amssymb, amsthm, enumitem, geometry |
| Lab report | aim, method, results table, figure, discussion | graphicx, booktabs, siunitx, float |
| Beamer talk | title, outline, section frames, "Questions" | (beamer class), graphicx |
| Letter | sender, recipient, opening, closing | (letter class) |
| Poster | three-column layout with blocks | tikzposter (class) |
| CV | education, experience, skills | enumitem, geometry, hyperref |

**Lists**

| Trigger | Inserts | Packages |
|---|---|---|
| `\ilist` | `itemize` with 3 items | — |
| `\elist` | `enumerate` with 3 items | — |
| `\dlist` | `description` with term/definition pairs | — |
| `\nlist` | nested list (2 levels) | — |
| `\clist` | compact list (`[noitemsep]`) | enumitem |
| `\alist` | lettered list a), b), c) | enumitem |
| `\rlist` | roman-numbered list i, ii, iii | enumitem |
| `\resume` | numbered list continuing the previous one | enumitem |
| `\checklist` | ☐ to-do list | enumitem, amssymb |
| `\inlist` | inline list (a) …, (b) … | enumitem (`inline`) |

**Tables**

| Trigger | Inserts | Packages |
|---|---|---|
| `\table` | basic `tabular` with `\hline` | — |
| `\booktab` | clean table with top/mid/bottom rules | booktabs |
| `\widetab` | full-width, stretchy `X` columns | tabularx, booktabs |
| `\longtab` | breaks across pages, header repeated | longtable, booktabs |
| `\numtab` | numbers aligned on the decimal point | siunitx, booktabs |
| `\mergetab` | merged cells example | multirow, booktabs |
| `\striptab` | alternating row colours | xcolor (`table`) |
| `\sidetab` | rotated table on its own page | rotating |
| `\heretab` | table pinned exactly here (`[H]`) | float |
| `\tabfig` | table and figure side by side | subcaption, graphicx |

**Figures and images**

| Trigger | Inserts | Packages |
|---|---|---|
| `\fig` | figure, image, caption, label | graphicx |
| `\subfig` | 2 subfigures side by side | graphicx, subcaption |
| `\grid` | 2×2 grid of subfigures | graphicx, subcaption |
| `\wrapfig` | image with text wrapping around it | graphicx, wrapfig |
| `\herefig` | figure pinned exactly here (`[H]`) | graphicx, float |
| `\svgfig` | figure from an SVG file | svg (needs Inkscape on the server) |
| `\widefig` | full-width figure in two-column layout | graphicx |

**Diagrams and plots**

| Trigger | Inserts | Packages |
|---|---|---|
| `\tikzpic` | empty `tikzpicture` (not `\tikz`, which draws inline pictures) | tikz |
| `\flow` | flowchart: 3 boxes and arrows | tikz (`positioning`, `arrows.meta`) |
| `\tree` | simple tree diagram | tikz |
| `\plot` | line plot of a function | pgfplots |
| `\plotdata` | plot from a data file or table | pgfplots |
| `\bar` | bar chart | pgfplots |
| `\cd` | commutative diagram | tikz-cd |

**Math environments**

| Trigger | Inserts | Packages |
|---|---|---|
| `\eq` | numbered `equation` with a label | amsmath |
| `\eqs` | unnumbered display `\[ … \]` | — |
| `\align` | `align` with 2 aligned lines | amsmath |
| `\gather` | centred equations, not aligned | amsmath |
| `\split` | one long equation over several lines | amsmath |
| `\cases` | piecewise function | amsmath |
| `\dcases` | piecewise function, display style | mathtools |
| `\pmat` `\bmat` `\vmat` | 2×2 matrix with ( ), [ ] or \| \| | amsmath |
| `\sys` | system of equations with a brace | amsmath |
| `\sube` | numbered sub-equations (1a), (1b) | amsmath |

**Theorems and proofs**

| Trigger | Inserts | Packages |
|---|---|---|
| `\thm` | theorem + its `\newtheorem` line | amsthm |
| `\lem` `\cor` `\prop` | lemma / corollary / proposition | amsthm |
| `\defn` | definition (upright style) | amsthm |
| `\rem` `\ex` | remark / example | amsthm |
| `\proof` | `proof` ending with □ | amsthm |
| `\thmset` | the whole theorem setup (preamble) | amsthm, amssymb |

**Citations and cross-references**

| Trigger | Inserts | Packages |
|---|---|---|
| `\bib` | biblatex: `\addbibresource` + `\printbibliography` | biblatex |
| `\bibtex` | classic BibTeX: style + bibliography | natbib |
| `\cref` | smart reference ("Figure 3") | hyperref, cleveref |
| `\lab` | `\label{}` with the right prefix (`fig:`, `tab:`, `eq:`, `sec:`) | — |
| `\quote` | quotation with proper quote marks | csquotes |
| `\fn` | footnote | — |
| `\url` | clickable link | hyperref |

**Code and algorithms**

| Trigger | Inserts | Packages |
|---|---|---|
| `\code` | code listing with language, caption, line numbers | listings |
| `\mint` | syntax-coloured code | minted (needs `-shell-escape`) |
| `\verb` | verbatim block | — |
| `\algo` | pseudocode: a procedure with steps and a return | algorithm, algpseudocode |

**Text, boxes and layout**

| Trigger | Inserts | Packages |
|---|---|---|
| `\box` | coloured callout box with a title | tcolorbox |
| `\note` `\warn` | note / warning box | tcolorbox |
| `\todo` | margin to-do note | todonotes |
| `\cols` | two text columns | multicol |
| `\color` | coloured text | xcolor |
| `\hl` | highlighted text | soul, xcolor |
| `\unit` | number with unit, e.g. 9.81 m/s² | siunitx |
| `\chem` | chemical formula or reaction | mhchem |
| `\margins` | page margins (preamble) | geometry |
| `\header` | custom header and footer (preamble) | fancyhdr |
| `\landscape` | one landscape page | pdflscape |

**Beamer** (offered only in beamer documents)

| Trigger | Inserts | Packages |
|---|---|---|
| `\frame` | frame with a title | — |
| `\bcols` | two columns inside a frame | — |
| `\block` | block / alertblock / exampleblock | — |
| `\step` | bullets that appear one by one | — |
| `\bfig` | frame with one centred image | graphicx |

### What each preset records

| Field | Purpose | Example |
|---|---|---|
| `trigger`, `label` | What you type and what the menu shows | `\booktab`, "Clean table (adds booktabs)" |
| `category` | Grouping in menus and docs | `table` |
| `context` | Where it's offered: text, math, preamble, beamer | `\frame` only in beamer |
| `template` | The text, with `#{name}` placeholders | — |
| `packages` | Packages with options and load order | `xcolor` with `[table]`; hyperref/cleveref load last |
| `preamble` | Extra preamble lines | `\newtheorem{theorem}{Theorem}`, `\usetikzlibrary{…}` |
| `conflicts` | Packages it clashes with | biblatex ↔ natbib, subcaption ↔ subfig |
| `warning` | One-time notice for server needs | minted needs `-shell-escape` |

**Rules for the "add package" helper**
- **Option clashes:** merge new options into an existing `\usepackage` line, because loading the same package twice with different options gives an "option clash" error.
- **Load order:** keep hyperref near the end of the preamble, and cleveref after it.
- **Conflicts:** ask before adding a package that conflicts with one already loaded.
- **Server needs:** check whether the AyakaLeaf TeX Live image has Inkscape (for `\svgfig`) and allows `-shell-escape` (for `\mint`) before shipping those two.

## 8 · Math auto-expansion

**What you see.** Inside math only (`$…$`, `\[…\]`, `equation`, `align`…), short triggers expand as you type. Outside math nothing happens, so URLs and comments are safe.

| Type | Becomes |
|---|---|
| `//` | `\frac{▮}{}` |
| `sq` | `\sqrt{▮}` |
| `^^` / `__` | `^{▮}` / `_{▮}` |
| `@a @b @g @d @e @l @p @s` | `\alpha \beta \gamma \delta \epsilon \lambda \pi \sigma` |
| `@G @D @L @S` | `\Gamma \Delta \Lambda \Sigma` |
| `->` `=>` `<=>` | `\to` `\implies` `\iff` |
| `<=` `>=` `!=` | `\leq` `\geq` `\neq` |
| `ooo` | `\infty` |
| `sum` / `int` | `\sum_{▮}^{}` / `\int_{▮}^{}` |
| `RR` `NN` `ZZ` | `\mathbb{R}` `\mathbb{N}` `\mathbb{Z}` (adds amssymb) |

**How it behaves**
- **Undo:** Ctrl+Z right after an expansion gives back exactly what you typed.
- **Not in text:** it doesn't fire inside `\text{…}`, `\mathrm{…}` or `\label{…}`.
- **Off switch:** a setting turns it off.
- **Your own rules:** you can edit the trigger list in Settings.
- **Vim mode:** expansion happens in insert mode only.

**Tricky cases.** Letter triggers (`sq`, `sum`, `int`) can fire inside real words. Symbol triggers are the safe default.

**How it's built.** A CodeMirror input handler checks the syntax tree to see whether you're inside a `Math` node (the grammar already uses that name), then matches the last typed characters against the rules.

**Built (Phase 4, 17 Nov 2026)** in `editor/math-auto-expand.ts`, with the math check shared with the snippets (`editor/math-context.ts`):
- **Rules:** the table above, plus the whole Greek alphabet (`@z` `\zeta`, `@w`… see Settings), `<->` `\leftrightarrow`, and `QQ` `CC`. Placeholders work as in snippets: `//` gives `\frac{▮}{}`, and Tab moves to the denominator.
- **Typing on:** a letter straight after `\alpha` gets a space first (`\alpha b`), and `<=` followed by `>` becomes `\iff`.
- **Word triggers** (`sq`, `sum`, `int`, `RR`…) fire only at the start of a word, so `\sqrt`, `\sum` and `\int` typed in full stay as they are.
- **Packages:** `\mathbb` from `RR` adds `amssymb` in the same step (one Ctrl+Z removes both) when the open file holds the preamble; in a chapter, the missing-package linter offers the fix instead of switching files mid-formula.
- **Also math:** an empty `equation` or `align`. **Not math:** `\text{}`, `\mathrm{}`, `\operatorname{}`, `\label{}`, `\ref{}` and the like.
- **Settings → Editor → SumiTeX:** the switch, and "Your math shortcuts": one rule per line (`@w \omega`, `hat \hat{#{}}#{}`), a trigger on its own to switch a built-in one off, with the built-in list shown below. Saved with your account (see Personal snippets).

## 9 · Draggable lists

**What you see**
- **Keyboard (step 1):** Alt+↑/↓ on any `\item` line moves the whole item, wrapped lines and sub-lists included. It's the VS Code "Move line" key made list-aware; Shift+Alt+↑/↓ stays "Copy line" (decided 14 Nov 2026).
- **Mouse (step 2, Visual mode only, decided 14 Nov 2026):** a ⋮⋮ grip next to each bullet. Source mode shows no grips and relies on Alt+↑/↓ and the list pop-up. Drag it, and a line shows where the item will land.

**How it behaves**
- **What an item is:** from its `\item` to the next `\item` at the same level, or to `\end{…}`.
- **Undo:** one move is one undo step.
- **List types:** works in `itemize`, `enumerate` and `description`. LaTeX renumbers `enumerate` by itself.
- **Indenting:** later, Tab / Shift+Tab nests or un-nests an item.

**Tricky cases**
- **Labels:** `\item[Label]` must move with its label.
- **Hidden `\item`:** an `\item` inside a comment or `verbatim` must be ignored, so the real version uses the syntax tree.
- **Collaborators:** needs testing with two browsers.

**How it's built.** A tested function finds the item's range. Keyboard commands swap neighbouring items in one edit. A drag grip is added to the Visual editor's list bullets (`visual/list-item-marker.ts`). The same logic powers the list pop-up opened from the Outline (feature 11).

## 10 · Draggable table columns

**What you see.** In Visual mode, a grip on each column header lets you drag the column left or right. A right-click menu offers Move left / Move right / Insert column / Delete column. In Source mode there are no grips (decided 14 Nov 2026): with the cursor in a cell, the palette's "Move column left/right" does the same, and the table pop-up from the Outline has draggable columns.

**How it behaves**
- **What moves:** every row moves the same cell, and the column spec moves with it: `{l c r}` → `{c l r}`.
- **Rules stay put:** `\hline` and the booktabs rules don't move.
- **Undo:** one move is one undo step.

**Tricky cases**
- **Merged cells:** a `\multicolumn` spans several columns. Version 1 refuses the move with a clear message.
- **Escaped `&`:** `\&` in text isn't a cell break.
- **Row endings:** extras such as `\\[2pt]` or `\\ \hline` stay with their row.
- **Other table types:** start with `tabular`, then add `tabularx`, `longtable` and `array`.

**How it's built.** It extends the Visual table generator (`visual/table-generator.ts`). Its cell-to-text mapping hasn't been read yet, and that mapping decides the size of this feature. The same column logic powers the table pop-up opened from the Outline (feature 11). Order of work:
1. Menu buttons.
2. Drag.
3. Merged cells.

## 11 · Outline with blocks

**Decided 14 Nov 2026:** there's one panel, the **Outline**, not a separate Blocks panel. The existing section outline gains block rows (figures, tables, lists, equations…). A **Blocks toggle** turns those rows off, which gives back the plain section outline. It stays narrow and is used for navigation; search, editing and adding happen elsewhere, where there's more room.

**Where it lives.** Its own **Outline** icon in the left rail, right under Files, opening a full-height panel (decided 14 Nov 2026, so the Files panel stays clean). The Files panel then shows only the file tree. Today `features/file-tree/components/file-tree-outline-panel.tsx` splits the Files panel into `FileTree` on top and `OutlineContainer` below; SumiTeX drops the lower half there and shows the outline as a rail entry instead. The Blocks toggle and type filter sit in the panel's header.

**What you see**

```
Blocks on                          Blocks off (plain outline)
┌ Outline ──── [▦] [All ▾] ┐       ┌ Outline ──── [▦]         ┐
│ ▾ 1 Introduction         │       │ ▾ 1 Introduction         │
│     ∑ E = mc²          • │       │ ▾ 2 Method               │
│ ▾ 2 Method               │       │     2.1 Setup            │
│     ≡ enumerate (5)      │       │ ▸ 3 Results              │
│     ▣ Setup photo        │       │ ▾ 4 Discussion           │
│ ▸ 3 Results           2  │       └──────────────────────────┘
│ ▾ 4 Discussion           │
│     ▤ Error rates      • │
└──────────────────────────┘
```

- **[▦] Blocks toggle:** shows or hides block rows. It's off by default and remembered per project, and the palette has a matching command "Outline: Show/Hide blocks".
- **[All ▾] type filter:** shown only while blocks are on. It offers All · Figures · Tables · Graphs · Lists · Equations · Code · Theorems · Notes · **Problems only**. Sections always stay visible as headings, so filtering never loses your place.
- **Rows:** one line each, an icon plus a short title, cut off with "…" when too long. Collapsed sections show how many blocks they hold (`2`).
- **`•` problem dot:** no caption, no label, or a label that's never referenced. Hover the dot to see which.
- **Hover card:** label, line number, table size, and a preview (image thumbnail or rendered formula). Previews live here so the panel can stay narrow.
- **Current position:** the row at the cursor is highlighted, as the outline already does for sections.

**Block types**

| Icon | Type | LaTeX it recognises |
|---|---|---|
| ▣ | Figures | `figure`, `figure*`, `wrapfigure`, `subfigure` |
| ▤ | Tables | `table`, `tabular`, `tabularx`, `longtable` (a `tabular` inside a `table` counts once) |
| ◇ | Graphs | `tikzpicture`, `axis` (pgfplots), `tikzcd` |
| ≡ | Lists | `itemize`, `enumerate`, `description` |
| ∑ | Equations | `equation`, `align`, `gather`, `\[…\]` |
| ‹› | Code | `lstlisting`, `minted`, `algorithm` |
| ◆ | Theorems | `theorem`, `lemma`, `definition`, `proof`, … |
| ✎ | Notes | `\todo`, `tcolorbox` |

**Using a row**

```
At rest:  │     ▣ Setup photo        │
Hover:    │     ▣ Setup photo   ✎ ⋯ │   ✎ = edit pop-up
                                        ⋯ = copy \cref, duplicate, delete
Click:    jump to the block in the editor
Drag:     reorder (v3)
```

- **Sections:** right-click for rename, promote/demote (`\subsection` ↔ `\section`, whole subtree), and move up/down with all their content.
- **Editing happens in a pop-up beside the block in the editor**, never inside the narrow panel. The pop-up rewrites the LaTeX text, so the source stays the single source of truth and undo, history and collaboration keep working.

| Type | Edit pop-up |
|---|---|
| Section | Title, level, starred (unnumbered) on/off, label |
| Figure | Image picker, width, caption, label, placement |
| Equation | Source with live preview, numbered on/off, equation ↔ align |
| List | Items with drag handles (logic from feature 9), itemize ↔ enumerate |
| Table | Small grid: add, delete and move rows and columns (logic from feature 10) |
| Graph / Code | Source box; graph preview after compile |

**What moved out of the panel**

| Need | Where it goes |
|---|---|
| Search blocks | Command palette with `@`, for example `@fig growth`, the way VS Code jumps to symbols |
| Add a block | Presets (`\fig`, `\booktab`…) or palette "Insert figure…" |
| Unused image files | File tree, as a badge (later) |
| Whole-project view | Later version. Like today's outline, v1 shows the open file only. |

**How it's built**
- **Data:** reuse what the outline already has. `useOutlineContext()` (`ide-react/context/outline-context.tsx`) provides `jumpToLine`, `highlightedLine` and the expanded state, and `useNestedOutline()` provides the section tree. Add a block scanner that walks the open file's syntax tree and attaches blocks to their section by line number.
- **Type table:** one data file maps LaTeX names to block types, shared with the preset catalogue.
- **Component:** `SumitexOutline` lives in `modules/sumitex/`. When blocks are off, it looks exactly like today's `OutlineContainer`.
- **Placement:** a `railEntries` module shaped like `modules/workbench/frontend/js/assistant-rail-entry.tsx`, with the key `sumitex-outline`, rendering `SumitexOutline`.
- **Two upstream edits, each marked `// SumiTeX`:** add `'sumitex-outline'` to `RailTabKey` in `ide-react/context/rail-context.tsx`, and in `file-tree-outline-panel.tsx` render only `FileTree` (no `OutlineContainer` below it). Upstream's outline code itself stays untouched, so merges stay easy.

**Tricky cases**
- **Hints, not guarantees:** "never referenced" can miss labels used through macros or in other files. v1 checks the open file only, so the dot needs a softer wording there, or wait for whole-project scanning.
- **Section moves stay within one file.** Moving across files can't be a single undo step.
- **Starred sections:** `\section*` has no number, and the outline must show that.
- **Speed:** rescan shortly after typing stops, and only the open file.

**Versions**

| Version | What it adds | Rough size |
|---|---|---|
| v1 | Block rows under sections, Blocks toggle, type filter, problem dots, hover cards, click to jump (open file only, view-only) | Small–medium |
| v2 | `@` search in the palette; edit pop-ups for sections, figures and equations; section right-click actions | Medium |
| v3 | Drag to reorder; list and table pop-ups (with features 9 and 10); whole-project outline | Large |
| v4 | Graph and table previews in hover cards, cropped from the PDF using SyncTeX | Optional |

## 12 · Notion-like preview editing (deferred)

**Plan for later.** Build on the existing Visual editor (`source-editor/extensions/visual/`):
- a `/` slash menu at the start of empty lines that reuses the presets
- block handles to drag paragraphs, figures and environments, reusing the drag logic from feature 9

---

## Further features (from the design doc)

The design doc's priorities table holds more ideas than the twelve above. Each follows the quiet-by-default rule. None has been checked against the code yet. Effort figures are the doc's rough single-developer estimates.

| Tier | Feature | Rough effort |
|---|---|---|
| P0 | Persistent editor state ("Back where you left off") | 1–2 days |
| P0 | Install as an app (see feature 1) | 1–2 days |
| P1 | Inline math preview and hover (KaTeX decorations) | 3–5 days |
| P1 | Image paste and drag with an automatic `\includegraphics` | 3–5 days |
| P2 | Project-wide search and replace, go to definition, rename | 1–2 weeks |
| P2 | DOI and arXiv paste to BibTeX; citation hover cards; bibliography health checks | 3–5 days each |
| P2 | Named snapshots and side-by-side diff (optional latexdiff PDF) | 1–2 weeks |
| P2 | Columns and side-by-side blocks (`multicols`, `minipage` with a draggable divider) | 1 week |
| P2 | Page and style panel (margins, font size, spacing, colours) | 1–2 weeks |
| P2 | New-project wizard, project templates, personal variables (name, affiliation, ORCID) | about 1 week + 2–3 days |
| P2 | Grammar check (self-hosted LanguageTool) and arXiv-ready export | 1–2 weeks |
| P2 | Theme picker; comment and mention webhooks | 3–5 days; 2–3 days |
| P2 | Insert-reference picker with context; selection wrappers (Ctrl+B / Ctrl+I); linked environment rename; smart paste | To estimate |
| P2 | Find what broke the build (history + compile); compile-finished notification | To estimate |
| P3 | PDF click-to-source with a quick-edit popover; overfull-box markers on the PDF (spike first) | 1 week; spike |
| P3 | Follow mode, beamer view, per-user dictionary, tablet support, image auto-optimize | To estimate |

## Suggested build order

This follows the roadmap whiteboard's phases. A phase starts when the gate before it passes.

1. **P0, foundation:** dev setup and backups; turn on the command palette and focus mode; create the `sumitex` module and rename the site; run one existing test; then features 1 (layout and run widget) → 3 → 4 → 2, persistent editor state, and the installable app. Progress 16 Nov 2026: 1, 2, 3, 4, persistent state and the app are done (Build Guide Phases 1 and 2); feature 6 (Phase 3) is next. *Gate 1: staging runs and a backup restore is tested.*
2. **P1, core:** the steps below up to math, plus dashboard project folders (feature 5), inline math preview, and image paste and drag. *Gate 2: the smoke suite passes after an upstream rebase.*
3. **Errors:** feature 6, whose "add package" helper feature 7 reuses.
4. **Presets and Outline:** feature 7 (start with the 10–15 most used presets), then Outline v1 (feature 11, block rows and toggle), then Outline v2 (`@` search and edit pop-ups).
5. **Math:** feature 8.
6. **Lists:** feature 9, keyboard part first, then drag, then the Outline list pop-up.
7. **Tables:** feature 10, then the Outline table pop-up (Outline v3).
8. **P2 and P3:** the structure editors and the further features above, then Outline v4 and feature 12. *Gate 3 (before P3): diagnostics and the Outline are stable in daily use.*

## Open questions

- [x] ~~Should SumiTeX snippets **replace** built-in ones with the same name, or sit alongside them?~~ Decided 14 Nov 2026: **alongside**, with SumiTeX's ranked first. Replacing them would quietly remove stock behaviour.
- [x] ~~Should a few text shortcuts (`...` → `\ldots`) also expand **outside** math?~~ Decided 14 Nov 2026: **no by default** (`...` is often literal in URLs, code and verbatim); an opt-in setting turns it on.
- [x] ~~Should the drag grips appear in Source mode too?~~ Decided 14 Nov 2026: **Visual mode only**, plus the handles inside the list and table pop-ups. Source mode uses Alt+↑/↓ for items and the palette's "Move column left/right" for columns. The mockup's frame 11 now shows this.
- [x] ~~Should **rows** also be draggable (simpler than columns, could ship first)?~~ Decided 14 Nov 2026: **yes, and rows ship before columns**: same grips, simpler, so they test the idea cheaply.
- [x] ~~Should the figure panel also list tables?~~ Decided: every block type, sections included, merged into the existing **Outline** with a Blocks toggle.
- [x] ~~Should the Blocks toggle be **on or off by default**?~~ Decided 14 Nov 2026: **off**, remembered per project, with a one-time hint pointing at the toggle. The mockup still shows it on and needs updating.
- [x] ~~Inline math preview and image paste: P1 or P2?~~ Decided 14 Nov 2026: **P1**, as in the design doc; the roadmap board now matches.
- [x] ~~Where does AyakaLeaf's **Python runner** go: the run widget's menu or its own panel?~~ Decided 14 Nov 2026: **the run widget's menu**, next to Recompile, with output in the logs pane. It gets its own panel only if it grows into an interactive console.
- [x] ~~Where do SumiTeX **docs** live (for error-hint links)?~~ Decided 14 Nov 2026: a **`docs/` folder of markdown in the repo**, served by the SumiTeX instance itself, so docs work offline, match the running version, and hints link to local pages.
- [x] ~~Does the AyakaLeaf TeX Live image include **Inkscape** and allow **`-shell-escape`**?~~ Checked 14 Nov 2026 on `ghcr.io/ayaka-notes/texlive-full:2026.1`: **both yes**. Inkscape 1.2.2 is installed (so `\usepackage{svg}` works) and `shell_escape = t` (full); `pygmentize` is there for `minted`. The compile service doesn't turn shell-escape off, and each compile runs in its own throwaway container as an unprivileged user (`SANDBOXED_COMPILES=true`), so keep that on. The 2025 image wasn't checked.

## Related documents

- [SumiTeX Build Guide](https://claude.ai/artifact/9o8ZBvLhzaC8w4LhEsQWkh): phases, code sketches, preset data shape
- [Software design document](https://claude.ai/artifact/PsxQCmzRWnZWmSBmRmRJNR): updated 16 Nov 2026 with Phase 1 progress
- [Roadmap whiteboard](https://claude.ai/artifact/DNmEjYxj6KhibYYM82Vs1j): updated 16 Nov 2026: done items in green, started in yellow
- [UI mockup](https://claude.ai/artifact/Kx8PqyQTSJpgtaSjGJixmW): every screen of the minimalist layout
- The old interactive demo (JynpJoQBtQSjfxL6dPhfV5) no longer opens from this account; the UI mockup replaces it.
