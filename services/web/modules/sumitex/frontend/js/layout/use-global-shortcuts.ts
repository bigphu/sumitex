/**
 * Page-wide keys (guide Phase 2; the shortcut scheme of 16 Nov 2026). They
 * work wherever the focus is, not only in the editor:
 *
 * - Ctrl + digit         choose the view: 1 Source, 2 Split, 3 PDF
 * - Ctrl+Shift + letter  open a place outside the editor (press again to
 *                        close it): E Files, Y Outline, H History,
 *                        M Problems and the log. F (project search) is Overleaf's own, and
 *                        O (jump to a section) opens the palette
 *                        (palette/palette-mode.ts).
 * - Ctrl+,               Settings
 * - Ctrl+Alt + letter    compile and the PDF: B build, J jump the PDF to
 *                        the cursor
 * - Shift+F5             stop the compile
 *
 * And, only while the focus is outside the editor (inside it, the editor's
 * own keymaps answer, and step aside for Vim and Emacs):
 *
 * - Ctrl+K Z             Zen mode
 * - Ctrl+K Ctrl+S        the shortcut sheet
 * - Ctrl+G               go to line (focuses the editor first)
 * - F8 / Shift+F8        next / previous problem
 *
 * In Zen: Ctrl+\ shows the PDF or the source again, and Esc leaves Zen
 * when the focus is outside the editor (inside it, the editor's own Esc
 * does, after closing any search or autocomplete).
 *
 * Cmd instead of Ctrl on a Mac. Read from the physical key (event.code), so
 * keyboard layouts don't matter. Letters a browser keeps for itself (N, T,
 * W, Q, I, J, C, R with Ctrl+Shift) are left alone.
 */
import { useEffect, useRef } from 'react'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useRailContext } from '@/features/ide-react/context/rail-context'
import { useCommandRegistry } from '@/features/ide-react/context/command-registry-context'
import { isMac } from '@/shared/utils/os'
import type { RailTabKey } from '@/features/ide-react/context/rail-context'
import { useEditorViewContext } from '@/features/ide-react/context/editor-view-context'
import { gotoLine } from '@codemirror/search'
import { nextDiagnostic, previousDiagnostic } from '@codemirror/lint'
import type { Command } from '@codemirror/view'
import { toggleLogPanel } from './log-panel-store'
import { SHOW_SHORTCUTS_EVENT, vscodeKeysOn } from '../editor/vscode-keymap'

// How long Ctrl+K waits for the second key of a chord
const CHORD_MS = 1500

const inEditor = (event: KeyboardEvent) =>
  event.target instanceof Element && event.target.closest('.cm-editor') !== null

// A text box elsewhere (chat, search, a dialog): a plain Z there is typing
const inTextBox = (event: KeyboardEvent) =>
  event.target instanceof HTMLElement &&
  (event.target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))

const VIEWS: Record<string, 'source' | 'split' | 'pdf'> = {
  Digit1: 'source',
  Digit2: 'split',
  Digit3: 'pdf',
  Numpad1: 'source',
  Numpad2: 'split',
  Numpad3: 'pdf',
}

export function useGlobalShortcuts(narrow: boolean) {
  const layout = useLayoutContext()
  const rail = useRailContext()
  const { registry } = useCommandRegistry()
  const { view: editorView } = useEditorViewContext()

  // Read the latest state inside one long-lived listener
  const latest = useRef({ layout, rail, registry, narrow, editorView })
  latest.current = { layout, rail, registry, narrow, editorView }

  useEffect(() => {
    const run = (id: string) =>
      latest.current.registry.get(id)?.handler?.({ location: 'keyboard-shortcut' })

    const togglePanel = (tab: RailTabKey) => {
      const { rail } = latest.current
      if (rail.isOpen && rail.selectedTab === tab) rail.setIsOpen(false)
      else rail.openTab(tab)
    }

    // Run an editor command from outside the editor, focusing it first
    const inEditorView = (command: Command) => () => {
      const view = latest.current.editorView
      if (!view) return
      view.focus()
      command(view)
    }

    // When Ctrl+K was pressed outside the editor, waiting for the next key
    let chordSince = 0

    const onKeyDown = (event: KeyboardEvent) => {
      if (inEditor(event)) {
        chordSince = 0
      } else if (
        chordSince &&
        !['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)
      ) {
        // The second key of a Ctrl+K chord
        const fresh = Date.now() - chordSince < CHORD_MS
        chordSince = 0
        const mod = isMac ? event.metaKey : event.ctrlKey
        let chord: (() => void) | null = null
        if (
          fresh &&
          event.code === 'KeyZ' &&
          !event.shiftKey &&
          !event.altKey &&
          !inTextBox(event)
        ) {
          chord = () => latest.current.layout.setFocusMode(on => !on)
        } else if (fresh && event.code === 'KeyS' && mod) {
          chord = () => window.dispatchEvent(new CustomEvent(SHOW_SHORTCUTS_EVENT))
        }
        if (chord) {
          event.preventDefault()
          event.stopPropagation()
          chord()
          return
        }
      }

      if (!inEditor(event) && event.code === 'F8' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        inEditorView(event.shiftKey ? previousDiagnostic : nextDiagnostic)()
        return
      }

      const { layout: current } = latest.current
      if (current.focusMode) {
        const noDialog = !document.querySelector('.modal.show')
        if (
          event.key === 'Escape' &&
          !inEditor(event) &&
          !inTextBox(event) &&
          noDialog
        ) {
          event.preventDefault()
          current.setFocusMode(false)
          return
        }
        const zenMod = isMac ? event.metaKey : event.ctrlKey
        if (zenMod && event.code === 'Backslash' && !event.shiftKey && !event.altKey) {
          event.preventDefault()
          event.stopPropagation()
          current.setView(current.view === 'pdf' ? 'editor' : 'pdf')
          return
        }
      }

      // Shift+F5 stops a compile, as it stops a run in VS Code
      if (
        event.code === 'F5' &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault()
        event.stopPropagation()
        run('stop-compile')
        return
      }

      const mod = isMac ? event.metaKey : event.ctrlKey
      if (!mod) return

      if (!inEditor(event) && !event.shiftKey && !event.altKey) {
        if (event.code === 'KeyK') {
          // Start a chord; the browser has no use for Ctrl+K on this page
          event.preventDefault()
          chordSince = Date.now()
          return
        }
        if (event.code === 'KeyG' && event.ctrlKey && vscodeKeysOn()) {
          event.preventDefault()
          inEditorView(gotoLine)()
          return
        }
      }

      const { layout, narrow } = latest.current
      const { focusMode, view, detachRole, changeLayout } = layout

      let action: (() => void) | null = null

      if (!event.shiftKey && !event.altKey && VIEWS[event.code]) {
        const choice = VIEWS[event.code]
        if (focusMode || view === 'history' || detachRole === 'detacher') return
        if (choice === 'split' && narrow) return
        action = () =>
          choice === 'split'
            ? changeLayout('sideBySide')
            : changeLayout('flat', choice === 'pdf' ? 'pdf' : 'editor')
      } else if (event.shiftKey && !event.altKey) {
        if (event.code === 'KeyE') action = () => togglePanel('file-tree')
        else if (event.code === 'KeyY')
          action = () => togglePanel('sumitex-outline')
        else if (event.code === 'KeyH')
          action = () =>
            view === 'history' ? layout.restoreView() : layout.setView('history')
        else if (event.code === 'KeyM') action = toggleLogPanel
      } else if (event.altKey && !event.shiftKey) {
        if (event.code === 'KeyB') action = () => run('compile')
        else if (event.code === 'KeyJ') action = () => run('synctex-sync-to-pdf')
      } else if (!event.shiftKey && !event.altKey && event.code === 'Comma') {
        action = () => run('open-settings')
      }

      if (!action) return
      event.preventDefault()
      event.stopPropagation()
      action()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
}
