/**
 * Open the edit pop-up from the editor (outline/edit/block-editor.tsx):
 * while the cursor is in a table, a list or an equation, or on a section's
 * line, a small "✎ Edit table" button sits at the end of its first line,
 * and Ctrl+K E opens the pop-up for that block. Elsewhere neither shows
 * nor does anything.
 */
import { Prec, RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import { requestEdit } from '../outline/edit/edit-requests'
import { blockAt, type OpenKind } from '../outline/edit/block-at'

class EditButton extends WidgetType {
  constructor(
    readonly pos: number,
    readonly kind: OpenKind
  ) {
    super()
  }

  eq(other: EditButton) {
    return other.pos === this.pos && other.kind === this.kind
  }

  toDOM() {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'sx-edit-block-button'
    button.title = `Edit this ${this.kind} (Ctrl+K E)`
    button.textContent = `✎ Edit ${this.kind}`
    button.addEventListener('mousedown', event => event.preventDefault())
    button.addEventListener('click', () => requestEdit(this.pos, this.kind))
    return button
  }

  ignoreEvent() {
    return true
  }
}

const buttonPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none

    constructor(readonly view: EditorView) {
      this.decorations = this.build()
    }

    update(update: ViewUpdate) {
      if (update.selectionSet || update.docChanged || update.viewportChanged) {
        this.decorations = this.build()
      }
    }

    build() {
      const { state } = this.view
      if (state.readOnly || !state.selection.main.empty) return Decoration.none
      const found = blockAt(state, state.selection.main.head, 'any')
      if (!found) return Decoration.none
      const line = state.doc.lineAt(found.anchor)
      const builder = new RangeSetBuilder<Decoration>()
      builder.add(
        line.to,
        line.to,
        Decoration.widget({
          widget: new EditButton(found.anchor, found.kind),
          side: 1,
        })
      )
      return builder.finish()
    }
  },
  { decorations: plugin => plugin.decorations }
)

export const editBlockButton = () => [
  buttonPlugin,
  Prec.high(
    keymap.of([
      {
        // The symbol picker at the cursor (symbols/symbol-picker-at-cursor)
        key: 'Mod-k m',
        run: () => {
          window.dispatchEvent(new Event('sumitex:open-symbols'))
          return true
        },
      },
      {
        key: 'Mod-k e',
        run: view => {
          const found = blockAt(view.state, view.state.selection.main.head, 'any')
          if (!found) return false
          requestEdit(found.anchor, found.kind)
          return true
        },
      },
    ])
  ),
  EditorView.baseTheme({
    '.sx-edit-block-button': {
      marginLeft: '10px',
      padding: '0 7px',
      verticalAlign: 'middle',
      color: 'var(--sx-muted, #6b7280)',
      font: '12px/18px var(--bs-body-font-family, sans-serif)',
      background: 'var(--sx-island-raised, #eef0f4)',
      border: '1px solid var(--sx-border, #d8dce3)',
      borderRadius: '999px',
      cursor: 'pointer',
    },
    '.sx-edit-block-button:hover': {
      color: 'var(--sx-fg, #1f2430)',
      borderColor: 'var(--sx-accent, #3b5bdb)',
    },
  }),
]
