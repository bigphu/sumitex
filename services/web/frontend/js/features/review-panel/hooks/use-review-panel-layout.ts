import { useRangesContext } from '../context/ranges-context'
import { useThreadsContext } from '@/features/review-panel/context/threads-context'
import { hasActiveRange } from '@/features/review-panel/utils/has-active-range'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useRailContext } from '@/features/ide-react/context/rail-context'
import { useCallback } from 'react'

export default function useReviewPanelLayout(): {
  showPanel: boolean
  showHeader: boolean
  mini: boolean
  openReviewPanel: () => void
  closeReviewPanel: () => void
} {
  const ranges = useRangesContext()
  const threads = useThreadsContext()
  // SumiTeX: Review opens as a list in the right island (reviewPanelOpen).
  // In the editor the stock panel stays in its small "mini" form, and opens
  // in full only while a new comment is being written (reviewInlineOpen).
  const { setReviewPanelOpen, reviewInlineOpen } = useRailContext()
  const { focusMode } = useLayoutContext()

  const openReviewPanel = useCallback(() => {
    setReviewPanelOpen(true)
  }, [setReviewPanelOpen])

  const closeReviewPanel = useCallback(() => {
    setReviewPanelOpen(false)
  }, [setReviewPanelOpen])

  const hasCommentOrChange = hasActiveRange(ranges, threads)
  const showPanel = focusMode ? false : reviewInlineOpen || !!hasCommentOrChange
  const mini = !reviewInlineOpen
  const showHeader = false // SumiTeX: the island has its own header

  return { showPanel, showHeader, mini, openReviewPanel, closeReviewPanel }
}
