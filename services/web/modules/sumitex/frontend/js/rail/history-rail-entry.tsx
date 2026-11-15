/**
 * History in the left strip (railEntries slot). It has no panel of its own:
 * the button opens the stock history view, like the toolbar's History button.
 */
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import MaterialIcon from '@/shared/components/material-icon'
import { useLayoutContext } from '@/shared/context/layout-context'
import type RailTab from '@/features/ide-react/components/rail/rail-tab'

const HistoryRailButton = forwardRef<HTMLButtonElement>((_props, ref) => {
  const { t } = useTranslation()
  const { view, setView, restoreView } = useLayoutContext()
  const open = view === 'history'

  return (
    <OLTooltip
      id="rail-tab-tooltip-sumitex-history"
      description={t('history')}
      overlayProps={{ delay: 0, placement: 'right' }}
    >
      <button
        ref={ref}
        type="button"
        // A plain button, not a Nav link: selecting it must not open a panel
        className={classNames('nav-link ide-rail-tab-link', {
          'open-rail': open,
        })}
        data-sx-rail-key="sumitex-history"
        aria-pressed={open}
        onClick={() => (open ? restoreView() : setView('history'))}
      >
        <MaterialIcon
          type="history"
          className="ide-rail-tab-link-icon"
          accessibilityLabel={t('history')}
        />
      </button>
    </OLTooltip>
  )
})
HistoryRailButton.displayName = 'HistoryRailButton'

export default {
  key: 'sumitex-history',
  icon: 'description', // unused: the custom tab draws its own icon
  title: 'History',
  component: null,
  // The rail passes RailTab's props; this button doesn't need them
  tab: HistoryRailButton as unknown as typeof RailTab,
}
