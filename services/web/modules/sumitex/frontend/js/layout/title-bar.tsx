/**
 * The SumiTeX title bar (guide 1d, step 3; mockup frame 1), on the frame
 * above the islands: the ensō main menu and "SumiTeX / Project ▾", a search
 * box that opens quick open, the run widget and Share.
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
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
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
import { ZenBar } from './zen-chrome'
import { useEditorContext } from '@/shared/context/editor-context'
import { useFeatureFlag } from '@/shared/context/split-test-context'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import RunWidget from './run-widget'
import { canInstall, installApp, subscribeInstall } from './install-app'
import MaterialIcon from '@/shared/components/material-icon'
import { isMac } from '@/shared/utils/os'

// The search box in the middle of the title bar (mockup frame 1). It opens
// the command palette's quick open, the same as Ctrl+P / Cmd+P.
function SearchBox() {
  const open = () =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: !isMac,
        metaKey: isMac,
        bubbles: true,
      })
    )
  return (
    <button type="button" className="sx-search" onClick={open}>
      <MaterialIcon type="search" />
      <span className="sx-search-label">Search</span>
      <kbd className="sx-search-key">{isMac ? '⌘P' : 'Ctrl+P'}</kbd>
    </button>
  )
}

// An ensō: one brush circle, heavy where the brush lands and thinning out to
// an open end. The same mark as the app icon (public/sumitex/enso.svg).
const ENSO_PATH =
  'M17.68,20.11 L17.30,20.37 L16.91,20.61 L16.51,20.83 L16.10,21.03 L15.68,21.22 L15.25,21.38 L14.81,21.53 L14.37,21.65 L13.92,21.75 L13.47,21.83 L13.01,21.89 L12.55,21.93 L12.10,21.94 L11.64,21.93 L11.18,21.91 L10.72,21.85 L10.27,21.78 L9.82,21.69 L9.37,21.57 L8.94,21.43 L8.51,21.27 L8.08,21.09 L7.67,20.90 L7.27,20.68 L6.88,20.44 L6.50,20.18 L6.14,19.91 L5.78,19.62 L5.45,19.32 L5.13,18.99 L4.82,18.66 L4.54,18.31 L4.26,17.95 L4.01,17.57 L3.78,17.19 L3.56,16.79 L3.37,16.39 L3.19,15.98 L3.04,15.56 L2.90,15.13 L2.78,14.70 L2.69,14.27 L2.61,13.83 L2.56,13.39 L2.52,12.95 L2.51,12.51 L2.51,12.07 L2.54,11.64 L2.58,11.20 L2.65,10.77 L2.73,10.34 L2.84,9.92 L2.96,9.50 L3.10,9.09 L3.26,8.69 L3.44,8.29 L3.63,7.91 L3.84,7.53 L4.07,7.17 L4.31,6.81 L4.57,6.47 L4.84,6.14 L5.13,5.82 L5.43,5.52 L5.74,5.23 L6.07,4.95 L6.40,4.69 L6.75,4.45 L7.11,4.22 L7.48,4.01 L7.85,3.81 L8.24,3.63 L8.63,3.47 L9.03,3.33 L9.44,3.21 L9.85,3.10 L10.26,3.01 L10.68,2.95 L11.10,2.90 L11.52,2.87 L11.94,2.86 L12.37,2.87 L12.79,2.90 L13.21,2.95 L13.62,3.02 L14.04,3.11 L14.44,3.22 L14.85,3.34 L15.24,3.49 L15.63,3.66 L16.01,3.84 L16.38,4.04 L16.74,4.26 L17.09,4.49 L17.42,4.74 L17.75,5.01 L18.06,5.29 L18.35,5.58 L18.63,5.89 L18.90,6.21 L19.15,6.54 L19.38,6.89 L19.60,7.24 L19.79,7.61 L19.97,7.98 L20.13,8.36 L20.28,8.75 L20.40,9.14 L20.50,9.54 L20.59,9.94 L20.65,10.34 L20.70,10.75 L20.72,11.15 L20.73,11.56 L20.71,11.96 L20.68,12.36 L20.62,12.76 L20.55,13.16 L20.45,13.54 L20.33,13.92 L19.65,13.77 L19.70,13.41 L19.74,13.05 L19.77,12.69 L19.78,12.33 L19.78,11.97 L19.76,11.61 L19.73,11.25 L19.68,10.89 L19.61,10.54 L19.53,10.19 L19.43,9.85 L19.31,9.51 L19.18,9.18 L19.04,8.85 L18.87,8.53 L18.70,8.23 L18.51,7.93 L18.30,7.64 L18.08,7.36 L17.85,7.09 L17.61,6.83 L17.35,6.59 L17.09,6.36 L16.81,6.14 L16.53,5.94 L16.23,5.75 L15.93,5.58 L15.62,5.42 L15.30,5.27 L14.98,5.15 L14.65,5.03 L14.32,4.94 L13.99,4.86 L13.65,4.80 L13.31,4.75 L12.97,4.72 L12.63,4.70 L12.29,4.70 L11.96,4.72 L11.62,4.75 L11.29,4.80 L10.96,4.86 L10.63,4.94 L10.31,5.03 L10.00,5.14 L9.69,5.26 L9.39,5.39 L9.10,5.54 L8.81,5.70 L8.53,5.87 L8.26,6.05 L8.00,6.25 L7.75,6.45 L7.51,6.67 L7.28,6.90 L7.06,7.13 L6.85,7.37 L6.66,7.63 L6.47,7.89 L6.30,8.15 L6.14,8.43 L5.99,8.71 L5.85,8.99 L5.73,9.29 L5.62,9.58 L5.52,9.88 L5.43,10.19 L5.36,10.49 L5.31,10.80 L5.26,11.11 L5.23,11.43 L5.22,11.74 L5.22,12.05 L5.23,12.37 L5.25,12.68 L5.29,12.99 L5.35,13.30 L5.42,13.60 L5.50,13.91 L5.59,14.21 L5.70,14.50 L5.83,14.79 L5.96,15.07 L6.11,15.35 L6.27,15.61 L6.45,15.87 L6.63,16.13 L6.83,16.37 L7.04,16.60 L7.26,16.83 L7.49,17.04 L7.72,17.24 L7.97,17.43 L8.23,17.61 L8.50,17.78 L8.77,17.93 L9.05,18.07 L9.33,18.19 L9.62,18.30 L9.92,18.40 L10.22,18.48 L10.52,18.55 L10.83,18.60 L11.14,18.64 L11.45,18.67 L11.76,18.67 L12.06,18.67 L12.37,18.65 L12.68,18.61 L12.98,18.56 L13.28,18.50 L13.58,18.42 L13.87,18.33 L14.15,18.22 L14.43,18.10 L14.71,17.97 L14.97,17.83 L15.23,17.67 L15.49,17.50 L15.73,17.32 Z'

function Enso() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        <path d={ENSO_PATH} />
        <circle cx="16.70" cy="18.72" r="1.70" />
      </g>
    </svg>
  )
}

function MainMenu() {
  const [open, setOpen] = useState(false)
  const installable = useSyncExternalStore(subscribeInstall, canInstall)
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
        {installable && (
          <button
            type="button"
            className="sx-main-menu-home sx-main-menu-install"
            onClick={() => {
              setOpen(false)
              installApp()
            }}
          >
            Install SumiTeX
          </button>
        )}
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

  // Zen has its own two buttons; History keeps the stock toolbar
  if (focusMode) return <ZenBar />
  if (view === 'history') return <Toolbar />

  return (
    <nav
      className="ide-redesign-toolbar sx-titlebar"
      aria-label={t('project_actions')}
    >
      <div className="sx-titlebar-start">
        <MainMenu />
        {/* SumiTeX / Project ▾, as in the mockup; the project name keeps the
            stock dropdown (rename, copy, download, …) */}
        <div className="sx-titlebar-crumb">
          <a className="sx-titlebar-app" href="/project">
            SumiTeX
          </a>
          <span className="sx-titlebar-slash" aria-hidden="true">
            /
          </span>
          <ToolbarProjectTitle />
        </div>
      </div>
      <SearchBox />
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
