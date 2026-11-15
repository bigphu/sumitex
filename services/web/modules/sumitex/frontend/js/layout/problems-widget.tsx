/**
 * The problems widget at the top-right of the editor-and-PDF island
 * (guide 1d, step 6): error, warning and layout counts from the last
 * compile, arrows to jump to the previous or next problem marked in the
 * open file, and a click on the counts opens the log.
 *
 * The log still opens in the PDF pane, as the stock logs button did; the
 * mockup's bottom panel comes later.
 */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { nextDiagnostic, previousDiagnostic } from '@codemirror/lint'
import MaterialIcon from '@/shared/components/material-icon'
import { useDetachCompileContext as useCompileContext } from '@/shared/context/detach-compile-context'
import { useEditorViewContext } from '@/features/ide-react/context/editor-view-context'
import { useLayoutContext } from '@/shared/context/layout-context'

export default function ProblemsWidget() {
  const { t } = useTranslation()
  const { logEntries, toggleLogs, showLogs, error, stoppedOnFirstError } =
    useCompileContext()
  const { view } = useEditorViewContext()
  const { pdfLayout, view: ideView, changeLayout } = useLayoutContext()

  const errors = logEntries?.errors?.length ?? 0
  const warnings = logEntries?.warnings?.length ?? 0
  const layout = logEntries?.typesetting?.length ?? 0
  const logsDisabled = Boolean(error || stoppedOnFirstError)

  const openLogs = useCallback(() => {
    // The log shows in the PDF pane, so bring the pane back if it's hidden
    if (!showLogs && pdfLayout === 'flat' && ideView === 'editor') {
      changeLayout('sideBySide')
    }
    toggleLogs()
  }, [showLogs, pdfLayout, ideView, changeLayout, toggleLogs])

  const jump = (direction: 'previous' | 'next') => {
    if (!view) return
    if (direction === 'next') nextDiagnostic(view)
    else previousDiagnostic(view)
    view.focus()
  }

  const summary = `${errors} errors, ${warnings} warnings, ${layout} layout notes`

  return (
    <div className="sx-problems" role="group" aria-label="Problems">
      <button
        type="button"
        className="sx-problems-counts"
        onClick={openLogs}
        disabled={logsDisabled}
        aria-pressed={showLogs}
        title={
          showLogs ? t('back_to_pdf') : `${summary}. ${t('view_logs')}`
        }
      >
        {errors > 0 && (
          <span className="sx-problems-count sx-problems-error">
            <MaterialIcon type="error" />
            {errors}
          </span>
        )}
        <span className="sx-problems-count sx-problems-warning">
          <MaterialIcon type="warning" />
          {warnings}
        </span>
        <span className="sx-problems-count sx-problems-info">
          <MaterialIcon type="info" />
          {layout}
        </span>
      </button>
      <button
        type="button"
        className="sx-problems-arrow"
        onClick={() => jump('previous')}
        title="Previous problem in this file"
        aria-label="Previous problem in this file"
      >
        <MaterialIcon type="keyboard_arrow_up" />
      </button>
      <button
        type="button"
        className="sx-problems-arrow"
        onClick={() => jump('next')}
        title="Next problem in this file"
        aria-label="Next problem in this file"
      >
        <MaterialIcon type="keyboard_arrow_down" />
      </button>
    </div>
  )
}
