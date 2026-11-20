/**
 * A thin bar over the editor in the SumiTeX guide's projects (the
 * bridge's useGuideBanner sets it):
 *
 * - the handbook, read-only: "SumiTeX guide · read-only, always the
 *   latest" and Open my playground →
 * - the handbook, for an admin who can edit it: that everyone else reads
 *   it read-only
 * - the user's playground: "Your playground: change anything" and Start
 *   over; when newer exercises exist, a button to get them
 *
 * A CodeMirror panel, like the track-changes banner, so it takes its own
 * row instead of covering the text.
 */
import { StateEffect, StateField } from '@codemirror/state'
import { EditorView, showPanel, type Panel } from '@codemirror/view'

export type GuideBanner =
  | { kind: 'handbook'; canEdit: boolean; hasPlayground: boolean; openPlayground: () => void }
  | {
      kind: 'playground'
      outdated: boolean
      startOver: () => void
      openGuide: () => void
    }

export const setGuideBanner = StateEffect.define<GuideBanner | null>()

function button(label: string, onClick: () => void, primary = false) {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = primary ? 'sx-guide-bar-button sx-guide-bar-primary' : 'sx-guide-bar-button'
  element.textContent = label
  element.addEventListener('mousedown', event => event.preventDefault())
  element.addEventListener('click', () => {
    element.disabled = true
    element.textContent = 'Opening…'
    onClick()
  })
  return element
}

function panel(banner: GuideBanner): Panel {
  const dom = document.createElement('div')
  dom.className = 'sx-guide-bar'
  dom.setAttribute('role', 'status')
  const text = document.createElement('span')
  text.className = 'sx-guide-bar-text'

  if (banner.kind === 'handbook') {
    const strong = document.createElement('strong')
    strong.textContent = 'SumiTeX guide'
    text.append(
      strong,
      banner.canEdit
        ? ' · you can edit it; everyone else reads it, read-only'
        : ' · read-only, always the latest'
    )
    // The buttons follow the text: the editor's error counter floats over
    // the right-hand end of this row
    dom.append(text)
    if (banner.hasPlayground) {
      dom.append(button('Open my playground →', banner.openPlayground, true))
    }
  } else {
    const strong = document.createElement('strong')
    strong.textContent = 'Your playground'
    text.append(
      strong,
      banner.outdated ? ' · new exercises are ready' : ' · change anything, it’s yours'
    )
    // With new exercises waiting, their button alone, so the bar stays one
    // line in a narrow editor (Help still opens the guide)
    dom.append(text)
    if (!banner.outdated) dom.append(button('Guide', banner.openGuide))
    dom.append(
      button(
        banner.outdated ? 'Get the new exercises' : 'Start over',
        banner.startOver,
        banner.outdated
      )
    )
  }
  return { dom, top: true }
}

const bannerField = StateField.define<GuideBanner | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setGuideBanner)) value = effect.value
    }
    return value
  },
  provide: field => showPanel.from(field, banner => (banner ? () => panel(banner) : null)),
})

export const guideBanner = () => [
  bannerField,
  EditorView.baseTheme({
    '.sx-guide-bar': {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      // The right-hand end stays clear for the editor's floating error counter
      padding: '5px 150px 5px 14px',
      flexWrap: 'wrap',
      fontFamily: 'var(--font-sans, sans-serif)',
      fontSize: '12.5px',
      color: 'var(--sx-fg, #1f2430)',
      background: 'var(--sx-selected-bg, #eef2ff)',
      borderBottom: '1px solid var(--sx-border, #d8dce3)',
    },
    '.sx-guide-bar-text strong': { color: 'var(--sx-accent, #3b5bdb)' },
    '.sx-guide-bar-button': {
      padding: '3px 10px',
      color: 'var(--sx-fg, #1f2430)',
      font: 'inherit',
      background: 'transparent',
      border: '1px solid var(--sx-border, #d8dce3)',
      borderRadius: '6px',
      cursor: 'pointer',
    },
    '.sx-guide-bar-button:hover': { borderColor: 'var(--sx-accent, #3b5bdb)' },
    '.sx-guide-bar-primary': {
      color: '#fff',
      background: 'var(--sx-accent-fill, #3b5bdb)',
      borderColor: 'transparent',
      fontWeight: '600',
    },
    '.sx-guide-bar-primary:hover': { background: 'var(--sx-accent-fill-hover, #364fc7)' },
  }),
]
