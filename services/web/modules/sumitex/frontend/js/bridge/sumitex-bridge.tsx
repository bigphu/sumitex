/**
 * Mounted inside the source editor through the sourceEditorComponents slot.
 * It draws nothing; it only connects React state to CodeMirror.
 */
import { useEffect, useRef } from 'react'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useCodeMirrorViewContext } from '@/features/source-editor/components/codemirror-context'
import { useCommandProvider } from '@/features/ide-react/hooks/use-command-provider'
import type { IdeLayout } from '@/shared/context/layout-context'
import { setZen } from '../editor/zen-mode'
import { useEditorPropertiesContext } from '@/features/ide-react/context/editor-properties-context'
import { applyCodeToolbarClass } from '../settings/prefs'
import { useUserSettingsContext } from '@/shared/context/user-settings-context'
import { useRailContext } from '@/features/ide-react/context/rail-context'
import { SHOW_SHORTCUTS_EVENT, setVscodeKeys } from '../editor/vscode-keymap'
import { useRecordRecentFile } from '../palette/recent-files'
import { useProjectPreamble } from '../diagnostics/use-project-preamble'
import { gotoLine } from '@codemirror/search'
import { useSnippetCommands } from '../completions/use-snippet-commands'

// The layout Zen came from ('sideBySide' or 'flat'), to go back to when it
// ends. Kept in localStorage so that leaving Zen after a reload still
// brings the split back.
const PREV_LAYOUT_KEY = 'sumitex.zen.prev-layout'

const readPrevLayout = (): IdeLayout | null => {
  try {
    return localStorage.getItem(PREV_LAYOUT_KEY) as IdeLayout | null
  } catch {
    return null
  }
}

const writePrevLayout = (layout: IdeLayout | null) => {
  try {
    if (layout) localStorage.setItem(PREV_LAYOUT_KEY, layout)
    else localStorage.removeItem(PREV_LAYOUT_KEY)
  } catch {
    // storage blocked: Zen still works, the PDF just stays hidden after leaving
  }
}

export default function SumitexBridge() {
  const view = useCodeMirrorViewContext()
  const { focusMode, setFocusMode, pdfLayout, changeLayout } =
    useLayoutContext()

  // Read the current layout inside the effect without re-running it
  const pdfLayoutRef = useRef(pdfLayout)
  pdfLayoutRef.current = pdfLayout

  // Zen follows the stock focus mode (Ctrl+K Z, or the palette)
  useEffect(() => {
    setZen(view, focusMode)

    if (focusMode) {
      // Zen starts on the source. Remember the layout it came from (kept
      // if already stored: after a reload in Zen the layout is already flat)
      if (!readPrevLayout()) {
        writePrevLayout(
          pdfLayoutRef.current === 'sideBySide' ? 'sideBySide' : 'flat'
        )
      }
      changeLayout('flat', 'editor')
    } else {
      // Leaving Zen always brings the source back: the split it came from,
      // or the source alone, even if Zen was showing the PDF (Ctrl+\)
      const prev = readPrevLayout()
      if (prev) {
        writePrevLayout(null)
        if (prev === 'sideBySide') changeLayout('sideBySide')
        else changeLayout('flat', 'editor')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, focusMode])

  // Body classes the styles follow: Visual mode, and the Code-mode
  // formatting toolbar preference (shell/_editor.scss)
  const { showVisual } = useEditorPropertiesContext()
  useEffect(() => {
    document.body.classList.toggle('sx-visual', Boolean(showVisual))
  }, [showVisual])
  useEffect(() => {
    applyCodeToolbarClass()
  }, [])

  // VS Code keys (editor/vscode-keymap.ts) step aside for Vim and Emacs
  const { userSettings } = useUserSettingsContext()
  useEffect(() => {
    setVscodeKeys(userSettings.mode !== 'vim' && userSettings.mode !== 'emacs')
  }, [userSettings.mode])

  // Ctrl+K Ctrl+S, from the editor keymap: the keyboard shortcuts sheet
  const { setActiveModal } = useRailContext()
  useEffect(() => {
    const show = () => setActiveModal('keyboard-shortcuts')
    window.addEventListener(SHOW_SHORTCUTS_EVENT, show)
    return () => window.removeEventListener(SHOW_SHORTCUTS_EVENT, show)
  }, [setActiveModal])

  // The palette's "Recent files"
  useRecordRecentFile()

  // The live linter's view of main.tex, and "Add package"
  useProjectPreamble(view)
  useSnippetCommands(view)

  // Palette entries. Zen sits under View, next to the stock "Toggle focus
  // mode"; every other sumitex-* command is listed by its own label. Their
  // keys show on the right of the row (palette/keys.ts).
  useCommandProvider(
    () => [
      {
        id: 'sumitex-toggle-zen-mode',
        label: 'Toggle Zen mode',
        handler: () => setFocusMode(mode => !mode),
      },
      {
        id: 'sumitex-go-to-line',
        label: 'Go to line…',
        // After the palette has closed and handed the focus back
        handler: () =>
          window.setTimeout(() => {
            view.focus()
            gotoLine(view)
          }, 60),
      },
      {
        id: 'sumitex-keyboard-shortcuts',
        label: 'Keyboard shortcuts',
        handler: () => setActiveModal('keyboard-shortcuts'),
      },
    ],
    [setFocusMode, setActiveModal, view]
  )

  return null
}
