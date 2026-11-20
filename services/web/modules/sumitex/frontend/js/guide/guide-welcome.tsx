/**
 * The guide welcome at the top of the projects panel: "New to SumiTeX?"
 * with Read the guide and Open my playground. It is built from small parts
 * (icon, message, actions, dismiss) and uses the app's own buttons, so it
 * picks up the theme's colours and hover states. Hidden for good once
 * dismissed; the Help menu and the command palette still open both.
 */
import { useState } from 'react'
import MaterialIcon from '@/shared/components/material-icon'
import OLButton from '@/shared/components/ol/ol-button'
import { openGuide, openPlayground, useGuideInfo } from './guide-store'

const HIDDEN_KEY = 'sumitex.guide.card-hidden'

const readHidden = () => {
  try {
    return localStorage.getItem(HIDDEN_KEY) === 'true'
  } catch {
    return false
  }
}

const writeHidden = () => {
  try {
    localStorage.setItem(HIDDEN_KEY, 'true')
  } catch {
    // storage blocked: hidden until the page reloads
  }
}

function GuideWelcomeMessage() {
  return (
    <div className="sx-guide-welcome-message">
      <strong>New to SumiTeX?</strong>
      <span>Read the guide, then practise in a playground of your own.</span>
    </div>
  )
}

function GuideWelcomeActions({
  showGuide,
  showPlayground,
}: {
  showGuide: boolean
  showPlayground: boolean
}) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="sx-guide-welcome-actions">
      {showGuide && (
        <OLButton variant="secondary" size="sm" onClick={openGuide}>
          Read the guide
        </OLButton>
      )}
      {showPlayground && (
        <OLButton
          variant="primary"
          size="sm"
          isLoading={busy}
          loadingLabel="Opening…"
          onClick={() => {
            setBusy(true)
            openPlayground().catch(() => setBusy(false))
          }}
        >
          Open my playground
        </OLButton>
      )}
    </div>
  )
}

function GuideWelcomeDismiss({ onDismiss }: { onDismiss: () => void }) {
  return (
    <OLButton
      variant="ghost"
      size="sm"
      className="sx-guide-welcome-dismiss"
      aria-label="Hide this"
      onClick={onDismiss}
    >
      <MaterialIcon type="close" />
    </OLButton>
  )
}

export default function GuideWelcome() {
  const info = useGuideInfo()
  const [hidden, setHidden] = useState(readHidden)
  if (!info.enabled || hidden) return null

  return (
    <section className="sx-guide-welcome" aria-label="SumiTeX guide">
      <MaterialIcon type="menu_book" className="sx-guide-welcome-icon" />
      <GuideWelcomeMessage />
      <GuideWelcomeActions
        showGuide={Boolean(info.guideProjectId)}
        showPlayground={Boolean(info.hasPlayground)}
      />
      <GuideWelcomeDismiss
        onDismiss={() => {
          setHidden(true)
          writeHidden()
        }}
      />
    </section>
  )
}
