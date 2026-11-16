/**
 * The PROBLEMS tab of the log panel, kept short for big projects:
 * - every problem is one collapsed line (icon, message, file:line) that
 *   expands to the stock card with its plain-language hint and actions;
 * - filter chips for Errors, Warnings and Layout (overfull / underfull
 *   boxes). Layout is off by default: in a long document it's most of the
 *   noise. The choice is remembered.
 * - warnings you've accepted (accept-problem-button.tsx) stay out of the
 *   list while "Hide accepted" is on in the panel's header.
 * Compile failures that aren't log entries (server errors, timeouts,
 * "compiled too recently", syntax-check issues, stopped on first error) show
 * above the list with the stock notices, as the old logs pane did.
 */
import { ElementType, useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import MaterialIcon from '@/shared/components/material-icon'
import PdfLogEntry from '@/features/pdf-preview/components/pdf-log-entry'
import { useDetachCompileContext as useCompileContext } from '@/shared/context/detach-compile-context'
import type { LogEntry } from '@/features/pdf-preview/util/types'
import PdfPreviewError from '@/features/pdf-preview/components/pdf-preview-error'
import PdfValidationIssue from '@/features/pdf-preview/components/pdf-validation-issue'
import StopOnFirstErrorPrompt from '@/features/pdf-preview/components/stop-on-first-error-prompt'
import TimeoutUpgradePromptNew from '@/features/pdf-preview/components/timeout-upgrade-prompt-new'
import getMeta from '@/utils/meta'
import { useProjectContext } from '@/shared/context/project-context'
import {
  getAccepted,
  getHideAccepted,
  loadAccepted,
  problemKey,
  subscribeAccepted,
} from './accepted-problems'
import importOverleafModules from '../../../../../frontend/macros/import-overleaf-module.macro'

// Module entries shown above the list in the stock view (for example the
// error assistant's last fix); keep them
const pdfLogEntriesComponents = importOverleafModules(
  'pdfLogEntriesComponents'
) as { import: { default: ElementType }; path: string }[]

type Filter = 'error' | 'warning' | 'layout'
const FILTER_KEY = 'sumitex.problems.filters'
const SHOW_AT_MOST = 200

const readFilters = (): Record<Filter, boolean> => {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTER_KEY) || 'null')
    if (saved && typeof saved === 'object') return { error: true, warning: true, layout: false, ...saved }
  } catch {
    // fall through to the defaults
  }
  return { error: true, warning: true, layout: false }
}

const kindOf = (entry: LogEntry): Filter =>
  entry.level === 'error'
    ? 'error'
    : entry.level === 'typesetting'
      ? 'layout'
      : 'warning'

export default function LogProblems() {
  const { t } = useTranslation()
  const { error, logEntries, stoppedOnFirstError, syncToEntry, validationIssues } =
    useCompileContext()
  const { compileTimeout } = getMeta('ol-compileSettings')
  const [filters, setFilters] = useState(readFilters)
  const { projectId } = useProjectContext()
  const accepted = useSyncExternalStore(subscribeAccepted, getAccepted)
  const hideAccepted = useSyncExternalStore(subscribeAccepted, getHideAccepted)
  useEffect(() => {
    loadAccepted(projectId)
  }, [projectId])
  const hasNotice = Boolean(
    error ||
      stoppedOnFirstError ||
      (validationIssues && Object.keys(validationIssues).length > 0)
  )

  const all = logEntries?.all ?? []
  const counts = { error: 0, warning: 0, layout: 0 }
  for (const entry of all) counts[kindOf(entry)]++
  const isHiddenAccepted = (entry: LogEntry) =>
    hideAccepted && accepted.has(problemKey(entry))
  const acceptedHidden = all.filter(isHiddenAccepted).length
  const shown = all.filter(
    entry => filters[kindOf(entry)] && !isHiddenAccepted(entry)
  )

  const toggle = (filter: Filter) =>
    setFilters(current => {
      const next = { ...current, [filter]: !current[filter] }
      try {
        localStorage.setItem(FILTER_KEY, JSON.stringify(next))
      } catch {
        // storage blocked: the filter lasts until reload
      }
      return next
    })

  return (
    <div className="sx-problems-list">
      <div className="sx-chips" role="group" aria-label="Show">
        {(
          [
            ['error', 'Errors', 'error'],
            ['warning', 'Warnings', 'warning'],
            ['layout', 'Layout', 'info'],
          ] as [Filter, string, string][]
        ).map(([filter, label, icon]) => (
          <button
            key={filter}
            type="button"
            aria-pressed={filters[filter]}
            className={classNames('sx-chip', `sx-chip-${filter}`, {
              'sx-chip-on': filters[filter],
            })}
            onClick={() => toggle(filter)}
            title={filter === 'layout' ? 'Overfull and underfull boxes' : undefined}
          >
            <MaterialIcon type={icon} className="sx-chip-icon" />
            {label}
            <span
              className={classNames('sx-chip-count', {
                'sx-chip-count-zero': counts[filter] === 0,
              })}
            >
              {counts[filter]}
            </span>
          </button>
        ))}
      </div>

      {hasNotice && (
        <div className="sx-log-notices">
          {stoppedOnFirstError && <StopOnFirstErrorPrompt />}
          {compileTimeout < 60 && error === 'timedout' ? (
            <TimeoutUpgradePromptNew />
          ) : (
            error && <PdfPreviewError error={error} />
          )}
          {validationIssues &&
            Object.entries(validationIssues).map(([name, issue]) => (
              <PdfValidationIssue key={name} name={name} issue={issue} />
            ))}
        </div>
      )}

      {pdfLogEntriesComponents.map(({ import: { default: Component }, path }) => (
        <Component key={path} />
      ))}

      {all.length === 0 ? (
        hasNotice ? null : (
          <p className="sx-log-empty">No problems in the last compile.</p>
        )
      ) : shown.length === 0 ? (
        <p className="sx-log-empty">
          Nothing to show with these filters ({all.length} hidden
          {acceptedHidden > 0 ? `, ${acceptedHidden} of them accepted` : ''}).
        </p>
      ) : (
        <div className="sx-log-entries">
          {shown.slice(0, SHOW_AT_MOST).map((entry, index) => (
            <PdfLogEntry
              key={entry.key}
              autoExpand={false}
              index={index}
              id={entry.key}
              logEntry={entry}
              ruleId={entry.ruleId}
              // The type goes in front here rather than through logType,
              // which would turn a non-text title into "[object Object]"
              headerTitle={
                <>
                  {entry.type ? `${entry.type} ` : ''}
                  {entry.messageComponent ?? entry.message}
                  {accepted.has(problemKey(entry)) && (
                    <span className="sx-accepted-pill">accepted</span>
                  )}
                </>
              }
              rawContent={entry.content}
              level={entry.level}
              contentDetails={entry.contentDetails}
              entryAriaLabel={t('log_entry_description', { level: entry.level })}
              sourceLocation={{ file: entry.file, line: entry.line, column: entry.column }}
              onSourceLocationClick={syncToEntry}
            />
          ))}
          {shown.length > SHOW_AT_MOST && (
            <p className="sx-log-empty">
              Showing the first {SHOW_AT_MOST} of {shown.length}. The LOG tab has the rest.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
