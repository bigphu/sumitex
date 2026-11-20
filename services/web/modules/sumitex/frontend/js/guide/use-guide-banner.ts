/**
 * The bridge's part of the guide: shows the bar over the editor
 * (editor/guide-banner.ts) when this project is the handbook or the
 * user's playground.
 */
import { useEffect } from 'react'
import type { EditorView } from '@codemirror/view'
import { useProjectContext } from '@/shared/context/project-context'
import { usePermissionsContext } from '@/features/ide-react/context/permissions-context'
import { setGuideBanner } from '../editor/guide-banner'
import { openGuide, openPlayground, useGuideInfo } from './guide-store'

const failed = (error: unknown) =>
  window.alert(error instanceof Error ? error.message : 'Something went wrong.')

export function useGuideBanner(view: EditorView) {
  const { projectId } = useProjectContext()
  const { write } = usePermissionsContext()
  const info = useGuideInfo()

  useEffect(() => {
    if (!info.enabled) return
    let banner = null
    if (projectId === info.guideProjectId) {
      banner = {
        kind: 'handbook' as const,
        canEdit: Boolean(write),
        hasPlayground: Boolean(info.hasPlayground),
        openPlayground: () => openPlayground().catch(failed),
      }
    } else if (projectId && projectId === info.playgroundProjectId) {
      banner = {
        kind: 'playground' as const,
        outdated: Boolean(info.outdated),
        openGuide,
        startOver: () => {
          const sure =
            info.outdated ||
            window.confirm(
              'Start over with a fresh playground? This one is kept, renamed “(cũ)”.'
            )
          if (sure) openPlayground(true).catch(failed)
          else window.location.reload()
        },
      }
    }
    view.dispatch({ effects: setGuideBanner.of(banner) })
  }, [view, projectId, write, info])
}
