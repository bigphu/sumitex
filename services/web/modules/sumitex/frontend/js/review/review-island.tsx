/**
 * The Review island (mockup frame 24): the list of suggestions and comments
 * in the right island, where Chat and the AI assistant also open.
 *
 * Mounted inside the source editor (sourceEditorComponents slot) so the
 * stock cards keep their editor contexts, and portaled into the island the
 * right strip draws (review-island-host.ts).
 *
 * Header: title, Accept all / Reject all for the open file, a "Comments
 * only" filter and the stock resolved-threads button. Body: the stock
 * Overview list, grouped by file.
 *
 * It also tells the review layout when a new comment is being written, so
 * the editor shows the stock inline box beside the line while you type it.
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { useCodeMirrorStateContext } from '@/features/source-editor/components/codemirror-context'
import { addCommentRangesField } from '@/features/source-editor/extensions/add-comment'
import { ReviewPanelOverview } from '@/features/review-panel/components/review-panel-overview'
import { ReviewPanelResolvedThreadsButton } from '@/features/review-panel/components/review-panel-resolved-threads-button'
import {
  useRangesActionsContext,
  useRangesContext,
} from '@/features/review-panel/context/ranges-context'
import { useReviewPanelStyles } from '@/features/review-panel/hooks/use-review-panel-styles'
import { useRailContext } from '@/features/ide-react/context/rail-context'
import { usePermissionsContext } from '@/features/ide-react/context/permissions-context'
import OLIconButton from '@/shared/components/ol/ol-icon-button'
import ReviewModeSwitcher from '@/features/review-panel/components/review-mode-switcher'
import {
  getReviewIslandHost,
  subscribeReviewIslandHost,
} from './review-island-host'

function ReviewList() {
  const { t } = useTranslation()
  const ranges = useRangesContext()
  const { acceptChanges, rejectChanges } = useRangesActionsContext()
  const { setReviewPanelOpen } = useRailContext()
  const permissions = usePermissionsContext()
  const style = useReviewPanelStyles()
  const [commentsOnly, setCommentsOnly] = useState(false)

  const changes = ranges?.changes ?? []
  const canDecide = Boolean(permissions.write) && changes.length > 0

  return (
    <div className="sx-review-island">
      <div className="sx-review-header">
        <h4 className="sx-review-title">{t('review')}</h4>
        {/* Editing / Reviewing / Viewing, moved here from the editor's
            corner: the mockup keeps the track-changes control in Review */}
        <div className="sx-review-mode">
          <ReviewModeSwitcher />
        </div>
        <ReviewPanelResolvedThreadsButton />
        <OLIconButton
          icon="close"
          size="sm"
          className="sx-review-close"
          accessibilityLabel={t('close')}
          onClick={() => setReviewPanelOpen(false)}
        />
      </div>
      <div className="sx-review-actions">
        <button
          type="button"
          className="sx-review-action"
          disabled={!canDecide}
          onClick={() => acceptChanges(...changes)}
          title="Accept every suggestion in this file"
        >
          Accept all
        </button>
        <button
          type="button"
          className="sx-review-action"
          disabled={!canDecide}
          onClick={() => rejectChanges(...changes)}
          title="Reject every suggestion in this file"
        >
          Reject all
        </button>
        <button
          type="button"
          className={classNames('sx-review-action sx-review-filter', {
            'sx-review-filter-on': commentsOnly,
          })}
          aria-pressed={commentsOnly}
          onClick={() => setCommentsOnly(value => !value)}
        >
          Comments only
        </button>
      </div>
      <div
        className={classNames(
          'review-panel-container review-panel-subview-overview sx-review-list',
          { 'sx-review-comments-only': commentsOnly }
        )}
        style={style}
      >
        <div className="review-panel-inner">
          <ReviewPanelOverview />
        </div>
      </div>
    </div>
  )
}

export default function ReviewIsland() {
  const host = useSyncExternalStore(
    subscribeReviewIslandHost,
    getReviewIslandHost
  )
  const state = useCodeMirrorStateContext()
  const { setReviewInlineOpen } = useRailContext()

  // While a new comment is being written, the editor shows the stock inline
  // panel so the box sits beside its line
  const addingComment = (state.field(addCommentRangesField, false)?.size ?? 0) > 0
  useEffect(() => {
    setReviewInlineOpen(addingComment)
  }, [addingComment, setReviewInlineOpen])

  return host ? createPortal(<ReviewList />, host) : null
}
