/**
 * A short message at the cursor that goes away by itself, for a command
 * that can't do what was asked and should say why (a column that can't
 * move, for instance). Moving the cursor or typing also clears it.
 */
import { StateEffect, StateField } from '@codemirror/state'
import { EditorView, showTooltip, Tooltip } from '@codemirror/view'

const SHOW_MS = 4000

const flashEffect = StateEffect.define<{ pos: number; text: string } | null>()

const flashField = StateField.define<Tooltip | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(flashEffect)) {
        const message = effect.value
        if (!message) return null
        return {
          pos: message.pos,
          above: true,
          create() {
            const dom = document.createElement('div')
            dom.className = 'sx-flash-message'
            dom.setAttribute('role', 'status')
            dom.textContent = message.text
            return { dom }
          },
        }
      }
    }
    if (value && (tr.docChanged || tr.selection)) return null
    return value
  },
  provide: field => showTooltip.from(field),
})

export const flashMessageExtension = () => [
  flashField,
  EditorView.baseTheme({
    '.cm-tooltip.cm-tooltip-above:has(.sx-flash-message)': {
      border: 'none',
      background: 'transparent',
    },
    '.sx-flash-message': {
      maxWidth: '360px',
      padding: '6px 10px',
      borderRadius: '6px',
      fontSize: '12.5px',
      lineHeight: '1.4',
      color: 'var(--sx-fg, #e6e9f0)',
      background: 'var(--sx-island-raised, #1f2430)',
      border: '1px solid var(--sx-border, #343a48)',
      boxShadow: '0 4px 14px rgb(0 0 0 / 25%)',
    },
  }),
]

/** Show `text` at the cursor for a few seconds */
export function flashMessage(view: EditorView, text: string) {
  // undefined: the extension isn't installed in this editor (null is
  // "installed, nothing showing")
  if (view.state.field(flashField, false) === undefined) return
  view.dispatch({
    effects: flashEffect.of({ pos: view.state.selection.main.head, text }),
  })
  window.setTimeout(() => {
    if (view.state.field(flashField, false)) {
      view.dispatch({ effects: flashEffect.of(null) })
    }
  }, SHOW_MS)
}
