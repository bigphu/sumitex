/**
 * The status bar along the bottom of the window (guide 1d, step 7), on the
 * frame rather than in an island: the path (folders › file › section; the
 * title bar already names the project), the last compile's problems (opens
 * the log), line and column, a rough word count, and the save state.
 *
 * Mounted by one marked line in ide-react/components/layout/main-layout.tsx.
 * In Zen it shrinks to one centred line (zen-chrome.tsx).
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Breadcrumbs from '@/features/source-editor/extensions/breadcrumbs'
import { useEditorViewContext } from '@/features/ide-react/context/editor-view-context'
import { useEditorSelectionContext } from '@/shared/context/editor-selection-context'
import { useUnsavedDocsContext } from '@/features/ide-react/context/unsaved-docs-context'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useFileTreeOpenContext } from '@/features/ide-react/context/file-tree-open-context'
import { ZenStatus } from './zen-chrome'
import { ProblemsStatus } from './problems-widget'

// A rough count for the open file: drops comments, \commands and braces and
// counts what's left. The stock Word count (File menu) counts the whole
// compiled document properly.
const countWords = (text: string) =>
  text
    .replace(/(^|[^\\])%.*$/gm, '$1')
    .replace(/\\[a-zA-Z@]+\*?/g, ' ')
    .replace(/[{}[\]$&~^_\\]/g, ' ')
    .split(/\s+/)
    .filter(word => /[\p{L}\p{N}]/u.test(word)).length

function useCursorPosition() {
  const { view } = useEditorViewContext()
  const { editorSelection } = useEditorSelectionContext()

  return useMemo(() => {
    if (!view || !editorSelection) return null
    const head = editorSelection.main.head
    if (head > view.state.doc.length) return null
    const line = view.state.doc.lineAt(head)
    return { line: line.number, column: head - line.from + 1 }
  }, [view, editorSelection])
}

function useWordCount(docId: string | undefined) {
  const { view } = useEditorViewContext()
  const { editorSelection } = useEditorSelectionContext()
  const [count, setCount] = useState<number | null>(null)

  // Recount shortly after the text or the open file changes, not on every key
  useEffect(() => {
    if (!view) return
    const timer = window.setTimeout(
      () => setCount(countWords(view.state.doc.toString())),
      400
    )
    return () => window.clearTimeout(timer)
  }, [view, editorSelection, docId])

  return count
}

function SaveState() {
  const { t } = useTranslation()
  const { unsavedDocs, isSavingStalled } = useUnsavedDocsContext()

  if (isSavingStalled) {
    return (
      <span className="sx-status-item sx-status-warn" role="status">
        {t('saving')}… (connection slow)
      </span>
    )
  }
  return (
    <span className="sx-status-item" role="status">
      {unsavedDocs.size > 0 ? `${t('saving')}…` : 'Saved'}
    </span>
  )
}

export default function StatusBar() {
  const { focusMode, view: ideView } = useLayoutContext()
  const { openEntity } = useFileTreeOpenContext()
  const isDoc = openEntity?.type === 'doc'
  const position = useCursorPosition()
  const words = useWordCount(isDoc ? openEntity.entity._id : undefined)

  if (focusMode) {
    return (
      <ZenStatus
        fileName={isDoc ? openEntity.entity.name : undefined}
        line={position?.line}
        words={isDoc ? words : null}
      />
    )
  }

  return (
    <footer className="sx-status-bar" aria-label="Status bar">
      {/* The path from the file down (the title bar names the project) */}
      <div className="sx-status-path" translate="no">
        {isDoc && ideView !== 'history' && <Breadcrumbs />}
      </div>
      <div className="sx-status-end">
        <ProblemsStatus />
        {isDoc && position && (
          <span className="sx-status-item">
            Ln {position.line}, Col {position.column}
          </span>
        )}
        {isDoc && words !== null && (
          <span
            className="sx-status-item"
            title="Rough count for this file. File › Word count gives the full count."
          >
            {words.toLocaleString()} words
          </span>
        )}
        <SaveState />
      </div>
    </footer>
  )
}
