/**
 * The compile log as a bottom panel under the editor (mockup frame 4),
 * opened from the problems widget. Two tabs: PROBLEMS (log-problems.tsx),
 * one collapsed line per problem with filter chips, and LOG (log-raw.tsx),
 * the raw output with file-loading noise folded away and a search box.
 * Clear cached files and close on the right. Its top edge drags to resize.
 *
 * It opens by itself when a compile ends with errors, and closes again
 * after the next clean compile if it opened by itself. It also stands in for
 * the stock logs pane in the PDF column: whatever would open that (a compile
 * failure, the logs shortcut) opens this panel instead, so the PDF stays.
 *
 * Mounted inside the source editor (sourceEditorComponents slot) and
 * portaled to the bottom of the editor column.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useCommandProvider } from '@/features/ide-react/hooks/use-command-provider'
import classNames from 'classnames'
import MaterialIcon from '@/shared/components/material-icon'
import LogProblems from './log-problems'
import LogRaw from './log-raw'
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
import {
  getAccepted,
  getHideAccepted,
  problemKey,
  setHideAccepted,
  subscribeAccepted,
} from './accepted-problems'

// The funnel of the mockup's filter buttons
const FilterIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5h16l-6 7.5V19l-4-2v-4.5z" />
  </svg>
)

// Compile results that leave the last PDF in place and need no action
const QUIET_ERRORS = new Set(['too-recently-compiled', 'compile-in-progress'])

export default function LogPanel() {
  const view = useCodeMirrorViewContext()
  const { focusMode } = useLayoutContext()
  const { compiling, error, logEntries, rawLog, setShowLogs, showLogs } =
    useCompileContext()
  const open = useSyncExternalStore(subscribeLogPanel, getLogPanelOpen)
  const tab = useSyncExternalStore(subscribeLogPanel, getLogPanelTab)
  const accepted = useSyncExternalStore(subscribeAccepted, getAccepted)
  const hideAccepted = useSyncExternalStore(subscribeAccepted, getHideAccepted)
  const [height, setHeight] = useState(getLogPanelHeight)
  const [host, setHost] = useState<Element | null>(null)
  const dragStart = useRef<{ y: number; height: number } | null>(null)

  useEffect(() => {
    setHost(view.dom.closest('.ide-redesign-editor-container'))
  }, [view])

  // Open by itself when a compile ends with errors; close again after a
  // clean compile, but only if it was this that opened it.
  // "compiling" can clear while the previous compile's log entries are still
  // set, and the new ones arrive later, so act on the first entries that
  // differ from those the compile started with.
  const entriesAtStart = useRef<typeof logEntries | null>(null)
  const openedByCompile = useRef(false)
  useEffect(() => {
    if (compiling && entriesAtStart.current === null) {
      entriesAtStart.current = logEntries
    }
  }, [compiling, logEntries])
  useEffect(() => {
    if (
      compiling ||
      entriesAtStart.current === null ||
      !logEntries ||
      logEntries === entriesAtStart.current
    ) {
      return
    }
    entriesAtStart.current = null
    const errorCount = logEntries.errors?.length ?? 0
    if (errorCount > 0 && !getLogPanelOpen()) {
      openedByCompile.current = true
      setLogPanel({ open: true, tab: 'problems' })
    } else if (errorCount === 0 && !error && openedByCompile.current) {
      openedByCompile.current = false
      setLogPanel({ open: false })
    }
  }, [compiling, logEntries, error])
  // The stock logs pane is replaced by this panel. Compile notices that
  // only mean "nothing new to show" don't open it; the PDF already on screen
  // is still right.
  useEffect(() => {
    if (!showLogs) return
    setShowLogs(false)
    if (error && QUIET_ERRORS.has(error)) return
    if (!getLogPanelOpen()) {
      // a compile's result (an error, or stopped on first error) rather
      // than the logs shortcut: close again after the next clean compile
      openedByCompile.current = Boolean(error) || entriesAtStart.current !== null
      setLogPanel({ open: true, tab: 'problems' })
    } else {
      setLogPanel({ tab: 'problems' })
    }
  }, [showLogs, setShowLogs, error])
  // In the palette (guide Phase 2c)
  useCommandProvider(
    () => [
      {
        id: 'sumitex-toggle-problems',
        label: 'Show or hide problems and the log',
        handler: () => setLogPanel({ open: !getLogPanelOpen() }),
      },
      {
        id: 'sumitex-show-log',
        label: 'Show the raw compile log',
        handler: () => setLogPanel({ open: true, tab: 'log' }),
      },
      {
        id: 'sumitex-hide-accepted',
        label: hideAccepted
          ? 'Show accepted warnings again'
          : 'Hide accepted warnings',
        handler: () => setHideAccepted(!hideAccepted),
      },
    ],
    [hideAccepted]
  )

  // Opened or closed by hand: no longer this effect's to close
  useEffect(() => {
    if (!open) openedByCompile.current = false
  }, [open])

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
  const listed = hideAccepted
    ? all.filter(entry => !accepted.has(problemKey(entry)))
    : all

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
          Problems <span className="sx-log-count">{listed.length}</span>
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
        {tab === 'problems' && (
          <button
            type="button"
            className="sx-log-filter"
            aria-pressed={hideAccepted}
            onClick={() => setHideAccepted(!hideAccepted)}
            title="Leave out the warnings you've accepted"
          >
            <FilterIcon />
            Hide accepted
          </button>
        )}
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
          <LogProblems />
        ) : rawLog ? (
          <LogRaw rawLog={rawLog} />
        ) : (
          <p className="sx-log-empty">No log yet: compile first.</p>
        )}
      </div>
    </section>,
    host
  )
}
