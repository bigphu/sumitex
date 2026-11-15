/**
 * The Outline's own entry in the left strip (railEntries slot), under Files.
 * For now it shows the stock outline full height; the Outline with blocks
 * (guide 6c) will replace the panel's contents later.
 */
import MaterialIcon from '@/shared/components/material-icon'
import { OutlineContainer } from '@/features/outline/components/outline-container'

function OutlineIcon({ title }: { open: boolean; title: string }) {
  return (
    <MaterialIcon
      type="format_list_bulleted"
      className="ide-rail-tab-link-icon"
      accessibilityLabel={title}
    />
  )
}

function OutlinePanel() {
  return (
    <div className="sx-outline-panel">
      <OutlineContainer />
    </div>
  )
}

export default {
  key: 'sumitex-outline',
  icon: OutlineIcon,
  title: 'Outline',
  component: <OutlinePanel />,
}
