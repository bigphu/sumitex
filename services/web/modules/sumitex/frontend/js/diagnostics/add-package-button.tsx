/**
 * "Add amssymb" on a compile error in the Problems panel
 * (pdfLogEntryHeaderActionComponents slot; guide Phase 3c, mockup frame 4).
 *
 * Shown on "Undefined control sequence" and "Environment … undefined" when
 * SumiTeX knows the package that provides the command or environment. The
 * line goes into the main file (editor/add-package.ts), then "Added" until
 * the next compile shows whether it worked. When the main file does load
 * the package, but only below the line that needs it (\usetikzlibrary
 * above \usepackage{tikz}), the button is "Load tikz earlier" and moves the
 * line up. The outcome always shows on the button. A link opens the
 * package's page on CTAN.
 */
import { useState, useSyncExternalStore } from 'react'
import MaterialIcon from '@/shared/components/material-icon'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import type { LogEntry } from '@/features/pdf-preview/util/types'
import { COMMANDS, ENVIRONMENTS, ctanUrl } from './packages'
import {
  getProjectPreamble,
  subscribeProjectPreamble,
  wasJustAdded,
} from './preamble-store'
import { AddResult, requestAddPackage } from '../editor/add-package'

/** The package that fixes this log entry, if SumiTeX knows one */
export function packageForLogEntry(entry: LogEntry): string | null {
  const detail = entry.contentDetails?.[0]
  if (!detail) return null
  if (entry.ruleId === 'hint_undefined_control_sequence') {
    const name = detail.match(/^\\([a-zA-Z]+)/)?.[1]
    return name && Object.prototype.hasOwnProperty.call(COMMANDS, name)
      ? COMMANDS[name].suggest
      : null
  }
  if (entry.ruleId === 'hint_undefined_environment') {
    return Object.prototype.hasOwnProperty.call(ENVIRONMENTS, detail)
      ? ENVIRONMENTS[detail].suggest
      : null
  }
  return null
}

const OUTCOME: Record<AddResult, string> = {
  added: 'Added',
  moved: 'Moved up',
  already: 'Already loaded',
  failed: 'Not changed',
}

export default function AddPackageButton({
  logEntry,
}: {
  logEntry?: LogEntry
  id?: string
}) {
  // Re-render when a package is added or the preamble is read again
  const { preamble, mainName } = useSyncExternalStore(
    subscribeProjectPreamble,
    getProjectPreamble
  )
  const [outcome, setOutcome] = useState<AddResult | null>(null)

  const name = logEntry ? packageForLogEntry(logEntry) : null
  if (!logEntry || !name) return null
  const where = mainName ?? 'the main file'

  // Already loaded in the main file, but the error is above that line:
  // the fix is to load it earlier, not to add it
  const inMain =
    !!mainName && logEntry.file?.replace(/^\.\//, '') === mainName
  const earlier = inMain && !!preamble?.loaded.has(name) && !!logEntry.line
  const done = outcome ?? (wasJustAdded(name) ? 'added' : null)

  const label = earlier ? `Load ${name} earlier` : `Add ${name}`
  const tip = done
    ? {
        added: `\\usepackage{${name}} is in ${where}. Recompile to check.`,
        moved: `\\usepackage{${name}} now comes before line ${logEntry.line}. Recompile to check.`,
        already: `${name} is already loaded in ${where}, before this line.`,
        failed: `Couldn't change ${where}. Add \\usepackage{${name}} by hand.`,
      }[done]
    : earlier
      ? `${where} loads ${name} after line ${logEntry.line}, which needs it. Move \\usepackage{${name}} up.`
      : `Add \\usepackage{${name}} to ${where}`

  return (
    <span className="sx-add-package">
      <OLTooltip
        id={`sx-add-package-${name}`}
        description={tip}
        overlayProps={{ delay: 0, placement: 'top' }}
      >
        <button
          type="button"
          className="sx-add-package-button"
          data-outcome={done ?? undefined}
          disabled={!!done}
          onClick={async event => {
            // The header toggles the entry open; keep this click to itself
            event.stopPropagation()
            setOutcome(
              await requestAddPackage(
                name,
                earlier ? { usedOnLine: logEntry.line } : undefined
              )
            )
          }}
        >
          <MaterialIcon
            type={done ? (done === 'failed' ? 'error' : 'check') : earlier ? 'arrow_upward' : 'add'}
          />
          {done ? OUTCOME[done] : label}
        </button>
      </OLTooltip>
      <a
        className="sx-add-package-link"
        href={ctanUrl(name)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={event => event.stopPropagation()}
        aria-label={`${name} on CTAN`}
      >
        CTAN
        <MaterialIcon type="open_in_new" />
      </a>
    </span>
  )
}
