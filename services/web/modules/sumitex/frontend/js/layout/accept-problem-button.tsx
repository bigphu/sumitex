/**
 * "Accept" on a warning in the log (pdfLogEntryHeaderActionComponents slot),
 * for a warning you've looked at and decided to live with, such as a small
 * overfull box. The button keeps its size and place in both states (an
 * accent ✓ once accepted; click again to take it back), so the actions line
 * up from row to row; the Problems list adds an "accepted" pill after the
 * message (log-problems.tsx). "Hide accepted" in the log panel's header then
 * keeps those out of the list.
 */
import { useEffect, useSyncExternalStore } from 'react'
import MaterialIcon from '@/shared/components/material-icon'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import { useProjectContext } from '@/shared/context/project-context'
import type { LogEntry } from '@/features/pdf-preview/util/types'
import {
  canAccept,
  getAccepted,
  loadAccepted,
  problemKey,
  subscribeAccepted,
  toggleAccepted,
} from './accepted-problems'

export default function AcceptProblemButton({
  logEntry,
  id,
}: {
  logEntry?: LogEntry
  id?: string
}) {
  const { projectId } = useProjectContext()
  const accepted = useSyncExternalStore(subscribeAccepted, getAccepted)

  useEffect(() => {
    loadAccepted(projectId)
  }, [projectId])

  if (!logEntry || !canAccept(logEntry)) return null

  const key = problemKey(logEntry)
  const isAccepted = accepted.has(key)

  return (
    <OLTooltip
      id={`sx-accept-${id ?? key}`}
      description={
        isAccepted
          ? 'Accepted. Click to show it as a warning again'
          : 'Accept this warning: it stays in the log, marked accepted'
      }
      overlayProps={{ placement: 'top' }}
    >
      <button
        type="button"
        className="sx-accept-button"
        aria-pressed={isAccepted}
        aria-label={isAccepted ? 'Accepted warning' : 'Accept warning'}
        onClick={event => {
          event.stopPropagation()
          toggleAccepted(key)
        }}
      >
        <MaterialIcon type="check" />
      </button>
    </OLTooltip>
  )
}
