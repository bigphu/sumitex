/**
 * A button's hover tip with its shortcut: "Files  Ctrl+Shift+E", the key
 * set in a small chip. Keys come from palette/keys.ts, written once.
 */
import type { ReactElement } from 'react'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import { keyLabel, PANEL_KEYS } from './keys'

export function KeyTip({
  label,
  keys,
}: {
  label: string
  /** "Mod+Shift+E"; alternatives as separate strings */
  keys?: string | string[]
}) {
  const list = keys === undefined ? [] : Array.isArray(keys) ? keys : [keys]
  if (!list.length) return <>{label}</>
  return (
    <span className="sx-key-tip">
      <span>{label}</span>
      {list.map(key => (
        <kbd key={key} className="sx-key-tip-key">
          {keyLabel(key)}
        </kbd>
      ))}
    </span>
  )
}

/** A rail or strip button's tip, by its panel key ('file-tree', …) */
export const panelTip = (key: string | undefined, label: string) => (
  <KeyTip label={label} keys={key ? PANEL_KEYS[key] : undefined} />
)

/** A button wrapped in the app's tooltip, its shortcut in the tip */
export function Tipped({
  id,
  label,
  keys,
  placement = 'bottom',
  children,
}: {
  id: string
  label: string
  keys?: string | string[]
  placement?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactElement
}) {
  return (
    <OLTooltip
      id={id}
      description={<KeyTip label={label} keys={keys} />}
      overlayProps={{ delay: { show: 200, hide: 0 }, placement }}
    >
      {children}
    </OLTooltip>
  )
}
