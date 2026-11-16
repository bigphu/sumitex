/**
 * The banner over the editor while tracked changes are on (mockup frame 24):
 * "Track changes is on · your edits show as suggestions". A CodeMirror panel,
 * so it takes its own row instead of covering the text. review/track-changes
 * turns it on and off with setTrackChangesBanner.
 */
import { StateEffect, StateField } from '@codemirror/state'
import { EditorView, showPanel, type Panel } from '@codemirror/view'

export const setTrackChangesBanner = StateEffect.define<boolean>()

function bannerPanel(): Panel {
  const dom = document.createElement('div')
  dom.className = 'sx-track-banner'
  dom.setAttribute('role', 'status')
  const strong = document.createElement('strong')
  strong.textContent = 'Track changes is on'
  dom.append(strong, ' · your edits show as suggestions')
  return { dom, top: true }
}

const bannerField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTrackChangesBanner)) value = effect.value
    }
    return value
  },
  provide: field => showPanel.from(field, on => (on ? bannerPanel : null)),
})

export const trackChangesBanner = () => [
  bannerField,
  EditorView.baseTheme({
    '.sx-track-banner': {
      padding: '4px 14px',
      fontFamily: 'var(--font-sans, sans-serif)',
      fontSize: '12px',
      color: 'var(--content-warning-themed, #e8b04a)',
      background:
        'color-mix(in srgb, var(--content-warning-themed, #e8b04a) 10%, transparent)',
      borderBottom:
        '1px solid color-mix(in srgb, var(--content-warning-themed, #e8b04a) 30%, transparent)',
    },
  }),
]
