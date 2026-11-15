/**
 * Mounted inside the source editor through the sourceEditorComponents slot.
 * It draws nothing; it only connects React state to CodeMirror.
 */
import { useEffect } from 'react'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useCodeMirrorViewContext } from '@/features/source-editor/components/codemirror-context'
import { setZen } from '../editor/zen-mode'

export default function SumitexBridge() {
  const view = useCodeMirrorViewContext()
  const { focusMode } = useLayoutContext()

  // Zen follows the stock focus mode (Ctrl+Shift+M, the palette, or Ctrl+K Z)
  useEffect(() => {
    setZen(view, focusMode)
  }, [view, focusMode])

  return null
}
