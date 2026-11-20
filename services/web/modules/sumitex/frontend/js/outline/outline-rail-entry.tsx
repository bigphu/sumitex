/**
 * The Outline's own entry in the left strip (railEntries slot), under Files:
 * the Outline with blocks (sumitex-outline.tsx), full height.
 */
import MaterialIcon from '@/shared/components/material-icon'
import SumitexOutline from './sumitex-outline'

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
      <SumitexOutline />
    </div>
  )
}

export default {
  key: 'sumitex-outline',
  icon: OutlineIcon,
  title: 'Outline',
  component: <OutlinePanel />,
}
