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
 * The three buttons leave the left strip (overrides/components/_rail.scss).
 */
import { forwardRef, ReactNode, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { Panel } from 'react-resizable-panels'
import MaterialIcon from '@/shared/components/material-icon'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import ChatPane from '@/features/chat/components/chat-pane'
import ChatIndicator from '@/features/chat/components/chat-indicator'
import { useChatContext } from '@/features/chat/context/chat-context'
import { HorizontalResizeHandle } from '@/features/ide-react/components/resize/horizontal-resize-handle'
import { useRailContext } from '@/features/ide-react/context/rail-context'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useEditorContext } from '@/shared/context/editor-context'
import { useProjectContext } from '@/shared/context/project-context'
import usePersistedState from '@/shared/hooks/use-persisted-state'
import getMeta from '@/utils/meta'
import { useAssistantDock } from '@modules/workbench/frontend/js/assistant-dock-context'
import { setReviewIslandHost } from '../review/review-island-host'
import NotificationsBell from './notifications-bell'

type RightTab = 'chat'

const StripButton = forwardRef<
  HTMLButtonElement,
  {
    icon: string
    label: string
    active: boolean
    disabled?: boolean
    onClick: () => void
    children?: ReactNode
  }
>(({ icon, label, active, disabled, onClick, children }, ref) => (
  <OLTooltip
    id={`sx-right-strip-${icon}`}
    description={label}
    overlayProps={{ delay: 0, placement: 'left' }}
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

export default function RightStrip({ order }: { order: number }) {
  const { t } = useTranslation()
  const { view, focusMode } = useLayoutContext()
  const { isRestrictedTokenMember } = useEditorContext()
  const { features } = useProjectContext()
  const { setResizing, reviewPanelOpen, setReviewPanelOpen } =
    useRailContext()
  const { markMessagesAsRead } = useChatContext()
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

  // Review can also open from elsewhere (the shortcut, a comment marker);
  // it then takes the island over from Chat and the AI assistant
  useEffect(() => {
    if (reviewPanelOpen) {
      setTab(null)
      if (dock.open && dock.side === 'right') dock.setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewPanelOpen])

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

  return (
    <>
      {(chatOpen || reviewOpen) && (
        <>
          <HorizontalResizeHandle onDragging={setResizing} />
          <Panel
            id="sx-right-panel"
            order={order}
            defaultSize={22}
            minSize={15}
            maxSize={50}
          >
            {reviewOpen ? (
              <div
                className="sx-right-panel sx-review-host"
                ref={setReviewIslandHost}
                data-empty-label="Open a file to review it"
              />
            ) : (
              <div className="sx-right-panel">
                <ChatPane />
              </div>
            )}
          </Panel>
        </>
      )}
      <nav className="sx-right-strip" aria-label="Right strip">
        {showReview && (
          <StripButton
            icon="rate_review"
            label={t('review_panel')}
            active={reviewOpen}
            disabled={view !== 'editor'}
            onClick={() => setReviewPanelOpen(open => !open)}
          />
        )}
        {showChat && (
          <StripButton
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
            icon="auto_awesome"
            label="AI assistant"
            active={aiOpen}
            onClick={toggleAi}
          />
        )}
        <div className="sx-right-strip-spacer" />
        <NotificationsBell />
      </nav>
    </>
  )
}
