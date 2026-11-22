/**
 * The problems widget at the top-right of the editor-and-PDF island
 * (guide 1d, step 6): error, warning and layout counts from the last
 * compile, arrows to jump to the previous or next problem marked in the
 * open file, and a click on the counts opens the log.
 *
 * The log opens as a panel under the editor (log-panel.tsx, mockup frame 4),
 * which also stands in for the stock log view in the PDF pane.
 *
 * With nothing to report (no compile problems, nothing marked in the file)
 * it isn't shown at all, so it doesn't sit over the first line; the status
 * bar says so instead and still opens the log (ProblemsStatus below).
 */
import { useSyncExternalStore } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import {
  diagnosticCount,
  nextDiagnostic,
  previousDiagnostic,
} from '@codemirror/lint'
import { Tipped } from '../palette/key-tip'
import MaterialIcon from '@/shared/components/material-icon'
import { useDetachCompileContext as useCompileContext } from '@/shared/context/detach-compile-context'
import { useEditorViewContext } from '@/features/ide-react/context/editor-view-context'
import { useCodeMirrorStateContext } from '@/features/source-editor/components/codemirror-context'
import {
  getLogPanelOpen,
  subscribeLogPanel,
  toggleLogPanel,
} from './log-panel-store'

// The last compile's counts
export function useCompileProblems() {
  const { logEntries } = useCompileContext()
  const errors = logEntries?.errors?.length ?? 0
  const warnings = logEntries?.warnings?.length ?? 0
  const layout = logEntries?.typesetting?.length ?? 0
  return { errors, warnings, layout, total: errors + warnings + layout }
}

export default function ProblemsWidget() {
  const { t } = useTranslation()
  const { view } = useEditorViewContext()
  const state = useCodeMirrorStateContext()
  const showLogs = useSyncExternalStore(subscribeLogPanel, getLogPanelOpen)
  const { errors, warnings, layout, total } = useCompileProblems()

  // Nothing from the compile and nothing marked in this file: no widget
  // (unless the log is open, so its toggle stays where it was)
  if (total === 0 && diagnosticCount(state) === 0 && !showLogs) return null

  const jump = (direction: 'previous' | 'next') => {
    if (!view) return
    if (direction === 'next') nextDiagnostic(view)
    else previousDiagnostic(view)
    view.focus()
  }

  const summary = `${errors} errors, ${warnings} warnings, ${layout} layout notes`

  return (
    <div className="sx-problems" role="group" aria-label="Problems">
      <Tipped
        id="sx-problems-counts-tip"
        label={`${summary}. ${t('view_logs')}`}
        keys="Mod+Shift+M"
      >
        <button
          type="button"
          className="sx-problems-counts"
          onClick={toggleLogPanel}
          aria-pressed={showLogs}
          aria-label={`${summary}. ${t('view_logs')}`}
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
      </Tipped>
      <Tipped
        id="sx-problems-previous-tip"
        label="Previous problem in this file"
        keys="Shift+F8"
      >
        <button
          type="button"
          className="sx-problems-arrow"
          onClick={() => jump('previous')}
          aria-label="Previous problem in this file"
        >
          <MaterialIcon type="keyboard_arrow_up" />
        </button>
      </Tipped>
      <Tipped
        id="sx-problems-next-tip"
        label="Next problem in this file"
        keys="F8"
      >
        <button
          type="button"
          className="sx-problems-arrow"
          onClick={() => jump('next')}
          aria-label="Next problem in this file"
        >
          <MaterialIcon type="keyboard_arrow_down" />
        </button>
      </Tipped>
    </div>
  )
}

/**
 * In the status bar: "No problems" (quiet) or the counts, either one opening
 * the log. The widget above only shows when there is something to report.
 */
export function ProblemsStatus() {
  const { t } = useTranslation()
  const showLogs = useSyncExternalStore(subscribeLogPanel, getLogPanelOpen)
  const { errors, warnings, layout, total } = useCompileProblems()
  const summary = `${errors} errors, ${warnings} warnings, ${layout} layout notes`

  return (
    <Tipped
      id="sx-status-problems-tip"
      label={`${summary}. ${t('view_logs')}`}
      keys="Mod+Shift+M"
      placement="top"
    >
      <button
        type="button"
        className={classNames('sx-status-item sx-status-problems', {
          'sx-status-problems-error': errors > 0,
          'sx-status-problems-warning': errors === 0 && warnings > 0,
        })}
        onClick={toggleLogPanel}
        aria-pressed={showLogs}
      >
        <span className="sx-status-problems-dot" aria-hidden="true" />
        {total === 0
          ? 'No problems'
          : [
              errors > 0 && `${errors} ${errors === 1 ? 'error' : 'errors'}`,
              warnings > 0 &&
                `${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`,
              errors === 0 &&
                warnings === 0 &&
                `${layout} layout ${layout === 1 ? 'note' : 'notes'}`,
            ]
              .filter(Boolean)
              .join(', ')}
      </button>
    </Tipped>
  )
}
