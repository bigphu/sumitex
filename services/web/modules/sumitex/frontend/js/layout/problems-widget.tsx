/**
 * The problems widget at the top-right of the editor-and-PDF island
 * (guide 1d, step 6): error, warning and layout counts from the last
 * compile, arrows to jump to the previous or next problem marked in the
 * open file, and a click on the counts opens the log.
 *
 * The log opens as a panel under the editor (log-panel.tsx, mockup frame 4),
 * which also stands in for the stock log view in the PDF pane.
 */
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { nextDiagnostic, previousDiagnostic } from '@codemirror/lint'
import MaterialIcon from '@/shared/components/material-icon'
import { useDetachCompileContext as useCompileContext } from '@/shared/context/detach-compile-context'
import { useEditorViewContext } from '@/features/ide-react/context/editor-view-context'
import {
  getLogPanelOpen,
  subscribeLogPanel,
  toggleLogPanel,
} from './log-panel-store'

export default function ProblemsWidget() {
  const { t } = useTranslation()
  const { logEntries } = useCompileContext()
  const { view } = useEditorViewContext()
  const showLogs = useSyncExternalStore(subscribeLogPanel, getLogPanelOpen)

  const errors = logEntries?.errors?.length ?? 0
  const warnings = logEntries?.warnings?.length ?? 0
  const layout = logEntries?.typesetting?.length ?? 0

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
        onClick={toggleLogPanel}
        aria-pressed={showLogs}
        title={`${summary}. ${t('view_logs')}`}
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
