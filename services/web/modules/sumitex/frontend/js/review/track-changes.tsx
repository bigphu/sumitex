/**
 * Track changes, as the mockup shows it (frame 24): a switch in the Review
 * island's header and a banner over the editor while it's on.
 *
 * The switch does what the stock Editing / Reviewing menu does: it turns
 * tracked changes on or off for you (or for guests, if you aren't signed in).
 */
import { useEffect } from 'react'
import { useTrackChangesStateActionsContext } from '@/features/review-panel/context/track-changes-state-context'
import { useTrackingChangesMode } from '@/shared/hooks/use-tracking-changes-mode'
import { useUserContext } from '@/shared/context/user-context'
import { usePermissionsContext } from '@/features/ide-react/context/permissions-context'
import { useProjectContext } from '@/shared/context/project-context'
import { useEditorContext } from '@/shared/context/editor-context'
import { useCodeMirrorViewContext } from '@/features/source-editor/components/codemirror-context'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import { setTrackChangesBanner } from '../editor/track-changes-banner'

export function TrackChangesSwitch() {
  const mode = useTrackingChangesMode()
  const user = useUserContext()
  const { write } = usePermissionsContext()
  const { features } = useProjectContext()
  const { setUpgradeTrackChangesModal } = useEditorContext()
  const { saveTrackChangesForCurrentUser, saveTrackChanges } =
    useTrackChangesStateActionsContext()

  const on = mode === 'review'
  const toggle = () => {
    if (!features.trackChanges) {
      setUpgradeTrackChangesModal({ show: true, location: 'review-switcher' })
      return
    }
    if (user?.id) saveTrackChangesForCurrentUser(!on)
    else saveTrackChanges({ on_for_guests: !on })
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="sx-track-switch"
      disabled={!write}
      onClick={toggle}
      title={on ? 'Your edits show as suggestions' : 'Your edits change the text directly'}
    >
      <span className="sx-track-switch-label">Track changes</span>
      <span className="sx-track-switch-track" aria-hidden="true">
        <span className="sx-track-switch-knob" />
      </span>
    </button>
  )
}

/** Mounted inside the editor (sourceEditorComponents): shows the banner. */
export default function TrackChangesBanner() {
  const view = useCodeMirrorViewContext()
  const mode = useTrackingChangesMode()
  const { currentDocumentId } = useEditorOpenDocContext()

  // Each file has its own editor state, so set it again when the file changes
  useEffect(() => {
    view.dispatch({ effects: setTrackChangesBanner.of(mode === 'review') })
  }, [view, mode, currentDocumentId])

  return null
}
