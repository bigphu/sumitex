/**
 * Extra controls for the PDF pill (mockup frame 1: page · Fit width · ⌖ · ⬇).
 * Adds "jump to the cursor's place in the PDF" (⌖), which replaces the
 * arrows that used to sit on the divider. It runs the stock
 * 'synctex-sync-to-pdf' command, and is portaled into the stock pill.
 * Going the other way, double-click in the PDF jumps to the source as before.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import MaterialIcon from '@/shared/components/material-icon'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import { useCommandRegistry } from '@/features/ide-react/context/command-registry-context'

const TARGET = '.ide-redesign-pdf-container .toolbar-pdf-right'

function useTarget() {
  const [target, setTarget] = useState<Element | null>(() =>
    document.querySelector(TARGET)
  )
  useEffect(() => {
    const find = () => {
      const element = document.querySelector(TARGET)
      setTarget(current => (current === element ? current : element))
    }
    find()
    const observer = new MutationObserver(find)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return target
}

export default function PdfPillExtras() {
  const target = useTarget()
  const { registry } = useCommandRegistry()
  const command = registry.get('synctex-sync-to-pdf')

  if (!target || !command?.handler) return null

  return createPortal(
    <OLTooltip
      id="sx-pdf-jump"
      description="Show the cursor's place in the PDF"
      overlayProps={{ placement: 'top' }}
    >
      <button
        type="button"
        className="pdf-toolbar-btn sx-pdf-jump"
        aria-label="Show the cursor's place in the PDF"
        disabled={command.disabled}
        onClick={() => command.handler?.({ location: 'pdf-pill' })}
      >
        <MaterialIcon type="my_location" />
      </button>
    </OLTooltip>,
    target
  )
}
