/**
 * "Back where you left off" (mockup frame 1; roadmap: persistent editor
 * state). The stock editor already reopens the last file, the cursor and
 * scroll position of each file (doc.position.<doc>) and the PDF position
 * (pdf.position.<root doc>). This says so once, when a project you have
 * opened before loads: the line and the PDF page you're back at.
 *
 * It goes away by itself after a few seconds, on Dismiss, or when you type.
 * Mounted inside the source editor (sourceEditorComponents slot).
 */
import { useEffect, useRef, useState } from 'react'
import { useCodeMirrorViewContext } from '@/features/source-editor/components/codemirror-context'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import { useProjectContext } from '@/shared/context/project-context'
import customLocalStorage from '@/infrastructure/local-storage'
import MaterialIcon from '@/shared/components/material-icon'

// Once per page load, for the first file that opens
let shownThisLoad = false

const SHOW_FOR_MS = 8000

export default function WelcomeBack() {
  const view = useCodeMirrorViewContext()
  const { currentDocumentId } = useEditorOpenDocContext()
  const { project } = useProjectContext()
  const [message, setMessage] = useState<{ line: number; page?: number } | null>(
    null
  )
  const checked = useRef(false)

  useEffect(() => {
    if (shownThisLoad || checked.current || !currentDocumentId) return
    checked.current = true

    // A saved position means you have been here before. Read it now, before
    // this visit saves its own.
    const saved = customLocalStorage.getItem(`doc.position.${currentDocumentId}`)
    if (!saved) return
    shownThisLoad = true

    // Give the editor a moment to restore the cursor, then read where it is
    const timer = window.setTimeout(() => {
      const line = view.state.doc.lineAt(view.state.selection.main.head).number
      const rootDocId = project?.rootDocId
      const pdf = rootDocId
        ? customLocalStorage.getItem(`pdf.position.${rootDocId}`)
        : null
      setMessage({
        line,
        page: typeof pdf?.page === 'number' ? pdf.page + 1 : undefined,
      })
    }, 900)
    return () => window.clearTimeout(timer)
  }, [currentDocumentId, view, project])

  // Leave after a while, or as soon as you start typing
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), SHOW_FOR_MS)
    const onKey = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && event.key.length === 1) {
        setMessage(null)
      }
    }
    view.contentDOM.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      view.contentDOM.removeEventListener('keydown', onKey)
    }
  }, [message, view])

  if (!message) return null

  return (
    <div className="sx-welcome-back" role="status">
      <MaterialIcon type="history" />
      <span>
        Back where you left off · line {message.line}
        {message.page ? ` · page ${message.page}` : ''}
      </span>
      <button
        type="button"
        className="sx-welcome-back-dismiss"
        onClick={() => setMessage(null)}
      >
        Dismiss
      </button>
    </div>
  )
}
