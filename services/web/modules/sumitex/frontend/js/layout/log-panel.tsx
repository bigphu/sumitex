/**
 * The compile log as a bottom panel under the editor (mockup frame 4),
 * opened from the problems widget. Two tabs: PROBLEMS, the stock list of
 * log entries with their plain-language hints and actions, and LOG, the raw
 * output. Clear cached files and close on the right. Its top edge drags to
 * resize.
 *
 * Mounted inside the source editor (sourceEditorComponents slot) and
 * portaled to the bottom of the editor column.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import classNames from 'classnames'
import MaterialIcon from '@/shared/components/material-icon'
import PdfLogsEntries from '@/features/pdf-preview/components/pdf-logs-entries'
import PdfClearCacheButton from '@/features/pdf-preview/components/pdf-clear-cache-button'
import { useDetachCompileContext as useCompileContext } from '@/shared/context/detach-compile-context'
import { useCodeMirrorViewContext } from '@/features/source-editor/components/codemirror-context'
import { useLayoutContext } from '@/shared/context/layout-context'
import {
  getLogPanelHeight,
  getLogPanelOpen,
  getLogPanelTab,
  saveLogPanelHeight,
  setLogPanel,
  subscribeLogPanel,
} from './log-panel-store'

export default function LogPanel() {
  const view = useCodeMirrorViewContext()
  const { focusMode } = useLayoutContext()
  const { logEntries, rawLog } = useCompileContext()
  const open = useSyncExternalStore(subscribeLogPanel, getLogPanelOpen)
  const tab = useSyncExternalStore(subscribeLogPanel, getLogPanelTab)
  const [height, setHeight] = useState(getLogPanelHeight)
  const [host, setHost] = useState<Element | null>(null)
  const dragStart = useRef<{ y: number; height: number } | null>(null)

  useEffect(() => {
    setHost(view.dom.closest('.ide-redesign-editor-container'))
  }, [view])

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      dragStart.current = { y: event.clientY, height }
      ;(event.target as Element).setPointerCapture(event.pointerId)
    },
    [height]
  )
  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragStart.current) return
    const next = dragStart.current.height + (dragStart.current.y - event.clientY)
    setHeight(Math.max(120, Math.min(next, window.innerHeight * 0.7)))
  }
  const onPointerUp = () => {
    if (dragStart.current) saveLogPanelHeight(height)
    dragStart.current = null
  }

  if (!open || !host || focusMode) return null

  const all = logEntries?.all ?? []
  const errors = logEntries?.errors?.length ?? 0

  return createPortal(
    <section className="sx-log-panel" style={{ height }} aria-label="Problems">
      <div
        className="sx-log-panel-grip"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize the problems panel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <div className="sx-log-panel-head" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'problems'}
          className={classNames('sx-log-tab', { 'sx-log-tab-on': tab === 'problems' })}
          onClick={() => setLogPanel({ tab: 'problems' })}
        >
          Problems <span className="sx-log-count">{all.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'log'}
          className={classNames('sx-log-tab', { 'sx-log-tab-on': tab === 'log' })}
          onClick={() => setLogPanel({ tab: 'log' })}
        >
          Log
        </button>
        <div className="sx-log-panel-spacer" />
        <PdfClearCacheButton />
        <button
          type="button"
          className="sx-log-close"
          aria-label="Close problems"
          onClick={() => setLogPanel({ open: false })}
        >
          <MaterialIcon type="close" />
        </button>
      </div>
      <div className="sx-log-panel-body">
        {tab === 'problems' ? (
          all.length > 0 ? (
            <div className="sx-log-entries">
              <PdfLogsEntries entries={all} hasErrors={errors > 0} />
            </div>
          ) : (
            <p className="sx-log-empty">
              No problems in the last compile.
            </p>
          )
        ) : (
          <pre className="sx-log-raw">{rawLog || 'No log yet: compile first.'}</pre>
        )}
      </div>
    </section>,
    host
  )
}
