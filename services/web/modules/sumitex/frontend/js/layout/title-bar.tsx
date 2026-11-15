/**
 * The SumiTeX title bar (guide 1d, step 3), on the frame above the islands:
 * the ensō main menu, the project name, the run widget and Share.
 *
 * It's built from the stock toolbar's parts. The ensō shows and hides the
 * stock menu bar (File, Edit, Insert, View, Format, Help) inline, as the
 * JetBrains main menu does. The layout and history buttons are gone from the
 * bar (they live in the tab bar and the left strip) but stay mounted, hidden,
 * because they register palette commands.
 *
 * Focus mode and the history view keep the stock toolbar. Mounted instead of
 * the stock toolbar by main-layout.tsx when the 'sumitex-title-bar' flag is
 * on, so the stock bar stays one setting away.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { Toolbar } from '@/features/ide-react/components/toolbar/toolbar'
import { ToolbarMenuBar } from '@/features/ide-react/components/toolbar/menu-bar'
import { ToolbarProjectTitle } from '@/features/ide-react/components/toolbar/project-title'
import { OnlineUsers } from '@/features/ide-react/components/toolbar/online-users'
import ShareProjectButton from '@/features/ide-react/components/toolbar/share-project-button'
import RequestAccessButton from '@/features/ide-react/components/toolbar/request-access-button'
import ChangeLayoutButton from '@/features/ide-react/components/toolbar/change-layout-button'
import ShowHistoryButton from '@/features/ide-react/components/toolbar/show-history-button'
import OfflineIndicator from '@/features/ide-react/components/toolbar/offline-indicator'
import useIsNetworkStalled from '@/features/ide-react/hooks/use-is-network-stalled'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useEditorContext } from '@/shared/context/editor-context'
import { useFeatureFlag } from '@/shared/context/split-test-context'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import RunWidget from './run-widget'

// An ensō: one open brush circle, the SumiTeX mark and the main-menu button
function Enso() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M18.8 6.3A8.5 8.5 0 1 0 20.5 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MainMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on Esc or a click outside, like any menu
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node
      // Menu dropdowns render in a portal, so ignore clicks inside them
      if (
        ref.current?.contains(target) ||
        (target as Element).closest?.('.dropdown-menu')
      ) {
        return
      }
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <div
      ref={ref}
      className={classNames('sx-main-menu', { 'sx-main-menu-open': open })}
    >
      <OLTooltip
        id="sx-main-menu-tooltip"
        description="Main menu"
        overlayProps={{ delay: { show: 300, hide: 0 }, placement: 'bottom' }}
      >
        <button
          type="button"
          className="sx-enso"
          aria-label="Main menu"
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
        >
          <Enso />
        </button>
      </OLTooltip>
      {/* Always mounted: the menu bar also registers palette commands */}
      <div className="sx-main-menu-items" hidden={!open}>
        <a className="sx-main-menu-home" href="/project">
          Projects
        </a>
        <ToolbarMenuBar />
      </div>
    </div>
  )
}

export default function TitleBar() {
  const { t } = useTranslation()
  const { view, focusMode } = useLayoutContext()
  const { isRestrictedTokenMember } = useEditorContext()
  const improvedFlakyConnections = useFeatureFlag(
    'intermittent-connection-improvements'
  )
  const isOfflineDueToNetworkStall = useIsNetworkStalled()

  if (focusMode || view === 'history') {
    return <Toolbar />
  }

  return (
    <nav
      className="ide-redesign-toolbar sx-titlebar"
      aria-label={t('project_actions')}
    >
      <div className="sx-titlebar-start">
        <MainMenu />
      </div>
      <ToolbarProjectTitle />
      <div className="sx-titlebar-end">
        {improvedFlakyConnections && (
          <OfflineIndicator isOffline={isOfflineDueToNetworkStall} />
        )}
        {!isOfflineDueToNetworkStall && <OnlineUsers />}
        <RequestAccessButton />
        <RunWidget />
        <ShareProjectButton />
        {/* Hidden, kept for the palette commands they register */}
        <div className="sx-titlebar-hidden" aria-hidden="true">
          {!isRestrictedTokenMember && <ShowHistoryButton />}
          <ChangeLayoutButton />
        </div>
      </div>
    </nav>
  )
}
