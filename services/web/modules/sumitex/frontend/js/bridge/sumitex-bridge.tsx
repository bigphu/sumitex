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

// The layout to go back to when Zen ends. Kept in localStorage so that
// leaving Zen after a reload still brings the PDF back.
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

  // Zen follows the stock focus mode (Ctrl+Shift+M, the palette, or Ctrl+K Z)
  useEffect(() => {
    setZen(view, focusMode)

    if (focusMode) {
      // Zen is source only: hide the PDF, and remember the split to restore
      if (pdfLayoutRef.current === 'sideBySide') {
        writePrevLayout('sideBySide')
        changeLayout('flat', 'editor')
      }
    } else {
      const prev = readPrevLayout()
      if (prev) {
        writePrevLayout(null)
        changeLayout(prev)
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

  // A palette entry under View, next to the stock "Toggle focus mode"
  useCommandProvider(
    () => [
      {
        id: 'sumitex-toggle-zen-mode',
        label: 'Toggle Zen mode (Ctrl+K Z)',
        handler: () => setFocusMode(mode => !mode),
      },
    ],
    [setFocusMode]
  )

  return null
}
