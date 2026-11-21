/**
 * The right strip (guide 1d, step 4): Review, Chat and the AI assistant, at
 * the window's right edge, with their panels opening on the right.
 *
 * Plugged in through the mainEditorLayoutPanels slot, which renders inside
 * the main panel group to the right of the editor-and-PDF island.
 * - Review opens here as a list (mockup frame 24). The list renders from
 *   inside the editor and is portaled into this panel (review/review-island).
 *   Its open state is the rail context's reviewPanelOpen, so every stock way
 *   of opening Review (shortcut, a click on a comment marker) opens it here.
 * - Chat opens here too (the stock ChatPane).
 * - The AI assistant docks on the right through its own module.
 * - Notifications sit at the foot of the strip (notifications-bell.tsx).
 * One panel at a time: they take turns in the same island.
 * The panel is not one of the panel group's panels: it is a plain column
 * with a width of its own (dragged from its left edge). As a group panel,
 * opening either side made the group restore a saved layout, which opened
 * or sized the other side too. Now the two sides never affect each other.
 * The three buttons leave the left strip (overrides/components/_rail.scss)
 * and sit in the title bar, next to Share (a slot title-bar.tsx keeps for
 * them), so no strip takes a column of its own. With the stock toolbar they
 * stay in a strip at the right edge.
 * It also keeps the project's dashboard thumbnail up to date
 * (thumbnails/pdf-thumbnail.ts).
 */
import {
  forwardRef,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import MaterialIcon from '@/shared/components/material-icon'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import ChatPane from '@/features/chat/components/chat-pane'
import ChatIndicator from '@/features/chat/components/chat-indicator'
import { useChatContext } from '@/features/chat/context/chat-context'
import { useRailContext } from '@/features/ide-react/context/rail-context'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useEditorContext } from '@/shared/context/editor-context'
import { useProjectContext } from '@/shared/context/project-context'
import usePersistedState from '@/shared/hooks/use-persisted-state'
import { usePdfThumbnail } from '../thumbnails/pdf-thumbnail'
import getMeta from '@/utils/meta'
import { useAssistantDock } from '@modules/workbench/frontend/js/assistant-dock-context'
import { setReviewIslandHost } from '../review/review-island-host'
import NotificationsBell from './notifications-bell'
import { createPortal } from 'react-dom'
import { usePortalTarget } from './use-portal-target'

type RightTab = 'chat'

const WIDTH_KEY = 'sumitex.right-panel-width'
const MIN_WIDTH = 260
const DEFAULT_WIDTH = 340
// Leave the editor at least this much of the window
const MIN_REST = 420

const clampWidth = (width: number) =>
  Math.round(
    Math.max(
      MIN_WIDTH,
      Math.min(width, window.innerWidth - MIN_REST, window.innerWidth * 0.5)
    )
  )

const StripButton = forwardRef<
  HTMLButtonElement,
  {
    icon: string
    label: string
    active: boolean
    disabled?: boolean
    onClick: () => void
    children?: ReactNode
    placement?: 'left' | 'bottom'
  }
>(({ icon, label, active, disabled, onClick, children, placement = 'left' }, ref) => (
  <OLTooltip
    id={`sx-right-strip-${icon}`}
    description={label}
    overlayProps={{ delay: 0, placement }}
  >
    <button
      ref={ref}
      type="button"
      className={classNames('sx-right-strip-button', {
        'sx-right-strip-button-active': active,
      })}
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <MaterialIcon type={icon} />
      {children}
    </button>
  </OLTooltip>
))
StripButton.displayName = 'StripButton'

export default function RightStrip() {
  // Always mounted in the editor: a good place to keep the project's
  // dashboard thumbnail up to date after each compile
  usePdfThumbnail()
  const { t } = useTranslation()
  const { view, focusMode } = useLayoutContext()
  const { isRestrictedTokenMember } = useEditorContext()
  const { features } = useProjectContext()
  const {
    setResizing,
    reviewPanelOpen,
    setReviewPanelOpen,
    panelRef: leftPanelRef,
  } = useRailContext()
  const { markMessagesAsRead, unreadMessageCount } = useChatContext()
  // The buttons go in the title bar (title-bar.tsx); with the stock toolbar
  // there is no such place, and they stay in a strip at the right edge
  const titleBarSlot = usePortalTarget('.sx-titlebar-panels')
  const dock = useAssistantDock()
  const [tab, setTab] = usePersistedState<RightTab | null>(
    'sumitex.right-panel',
    null
  )

  const showReview = Boolean(features.trackChangesVisible)
  const showChat =
    Boolean(getMeta('ol-capabilities')?.includes('chat')) &&
    !isRestrictedTokenMember
  const { aiAvailable } = getMeta('ol-ExposedSettings') as {
    aiAvailable?: boolean
  }

  const aiOpen = Boolean(aiAvailable && dock.side === 'right' && dock.open)
  const reviewOpen = showReview && reviewPanelOpen
  const chatOpen = showChat && tab === 'chat' && !reviewOpen
  const panelOpen = chatOpen || reviewOpen

  const [width, setWidth] = usePersistedState<number>(
    WIDTH_KEY,
    DEFAULT_WIDTH
  )

  // Drag the left edge to resize; the strip is on the right, so moving
  // left makes the panel wider
  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = width
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    setResizing(true)
    const onMove = (move: PointerEvent) =>
      setWidth(clampWidth(startWidth + startX - move.clientX))
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onUp)
      setResizing(false)
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
    handle.addEventListener('pointercancel', onUp)
  }

  // The group's panels share what the dock leaves them, in percentages, so
  // the dock opening, closing or resizing would also resize the left side
  // panel. Rescale the left panel to keep its width in pixels.
  const dockRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLElement>(null)
  // null until the first run: on mount the saved layout already fits
  const dockSpace = useRef<number | null>(null)
  useLayoutEffect(() => {
    // Zen and History hide the dock and lay the page out their own way; it
    // comes back as it was, so there is nothing to make up for
    if (focusMode || view === 'history') return
    const dockEl = dockRef.current
    let space = 0
    if (dockEl) {
      const style = getComputedStyle(dockEl)
      // A drawer (narrow windows) floats over the editor and takes no room
      if (style.position !== 'absolute' && style.position !== 'fixed') {
        space =
          dockEl.getBoundingClientRect().width + parseFloat(style.marginLeft)
      }
    }
    const delta = space - (dockSpace.current ?? space)
    dockSpace.current = space
    if (Math.abs(delta) < 0.5) return
    const left = leftPanelRef.current
    const group = (dockEl ?? stripRef.current)?.parentElement
    if (!left || !group || left.isCollapsed()) return
    let free = 0
    for (const el of group.children) {
      if (el.hasAttribute('data-panel')) free += el.getBoundingClientRect().width
    }
    if (free <= 0) return
    left.resize(Math.min(80, (left.getSize() * (free + delta)) / free))
  })

  // Review can also open from elsewhere (the shortcut, a comment marker);
  // it then takes the island over from Chat and the AI assistant
  useEffect(() => {
    if (reviewPanelOpen) {
      setTab(null)
      if (dock.open && dock.side === 'right') dock.setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewPanelOpen])

  // The stock chat counts a message as read only while the left strip's
  // Chat tab is open; here Chat is open on the right, so do that here
  useEffect(() => {
    if (chatOpen && unreadMessageCount > 0) markMessagesAsRead()
  }, [chatOpen, unreadMessageCount, markMessagesAsRead])

  if (focusMode || view === 'history') return null

  // One panel at a time on the right: Chat and the AI assistant share it
  const toggleChat = () => {
    if (chatOpen) {
      setTab(null)
    } else {
      setReviewPanelOpen(false)
      setTab('chat')
      markMessagesAsRead()
      if (aiOpen) dock.setOpen(false)
    }
  }

  const toggleAi = () => {
    if (aiOpen) {
      dock.setOpen(false)
    } else {
      setTab(null)
      setReviewPanelOpen(false)
      if (dock.side !== 'right') dock.moveTo('right')
      dock.setOpen(true)
    }
  }

  const buttons = (placement: 'left' | 'bottom') => (
    <>
        {showReview && (
          <StripButton
            placement={placement}
            icon="rate_review"
            label={t('review_panel')}
            active={reviewOpen}
            disabled={view !== 'editor'}
            onClick={() => setReviewPanelOpen(open => !open)}
          />
        )}
        {showChat && (
          <StripButton
            placement={placement}
            icon="forum"
            label={t('chat')}
            active={chatOpen}
            onClick={toggleChat}
          >
            <ChatIndicator />
          </StripButton>
        )}
        {aiAvailable && (
          <StripButton
            placement={placement}
            icon="auto_awesome"
            label="AI assistant"
            active={aiOpen}
            onClick={toggleAi}
          />
        )}
        <div className="sx-right-strip-spacer" />
        <NotificationsBell placement={placement} />
    </>
  )

  return (
    <>
      {panelOpen && (
        <div
          className="sx-right-dock"
          ref={dockRef}
          style={{ width: clampWidth(width) }}
          data-sx-right-dock
        >
          <div
            className="sx-right-dock-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            onPointerDown={startResize}
            onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
          />
          {reviewOpen ? (
            <div
              className="sx-right-panel sx-review-host"
              ref={setReviewIslandHost}
              data-empty-label="Open a file to review it"
            />
          ) : (
            <div
              className="sx-right-panel"
              onClickCapture={event => {
                // The stock chat header's close button collapses the left
                // side panel (it was written for the left strip): close
                // the chat here instead
                const button =
                  event.target instanceof Element &&
                  event.target.closest(
                    '.rail-panel-header-actions .rail-panel-header-button-subdued'
                  )
                if (button && button.getAttribute('aria-label') === t('close')) {
                  event.preventDefault()
                  event.stopPropagation()
                  setTab(null)
                }
              }}
            >
              <ChatPane />
            </div>
          )}
        </div>
      )}
      {titleBarSlot ? (
        <>
          {/* Keeps a place in the panel group, for the resize sums above */}
          <span className="sx-right-anchor" ref={stripRef} hidden />
          {createPortal(buttons('bottom'), titleBarSlot)}
        </>
      ) : (
        <nav className="sx-right-strip" aria-label="Right strip" ref={stripRef}>
          {buttons('left')}
        </nav>
      )}
    </>
  )
}
