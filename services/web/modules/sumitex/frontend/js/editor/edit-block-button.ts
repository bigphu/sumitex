/**
 * Open the edit pop-up from the editor (outline/edit/block-editor.tsx):
 * while the cursor is in a table or a list, a small "✎ Edit table" button
 * sits at the end of its \begin line, and Ctrl+K E opens the pop-up for
 * the block at the cursor. Elsewhere neither shows nor does anything.
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
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { getEnvironmentName } from '@/features/source-editor/utils/tree-operations/environments'
import { requestEdit } from '../outline/edit/edit-requests'

const TABLES = new Set([
  'table',
  'table*',
  'tabular',
  'tabular*',
  'tabularx',
  'tabulary',
  'longtable',
  'array',
])

/** The outermost table, or the innermost list, around `pos` */
function blockAround(view: EditorView, pos: number) {
  const tree = ensureSyntaxTree(view.state, pos, 50) ?? syntaxTree(view.state)
  let table: SyntaxNode | null = null
  for (
    let node: SyntaxNode | null = tree.resolveInner(pos, 1);
    node;
    node = node.parent
  ) {
    if (node.type.is('ListEnvironment')) {
      // A list inside a table cell is rare; the list wins when inside
      return table ? { node: table, kind: 'table' as const } : { node, kind: 'list' as const }
    }
    if (node.type.is('$Environment') && TABLES.has(getEnvironmentName(node, view.state) ?? '')) {
      table = node // keep going: the float around the tabular
    }
  }
  return table ? { node: table, kind: 'table' as const } : null
}

class EditButton extends WidgetType {
  constructor(
    readonly pos: number,
    readonly kind: 'table' | 'list'
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
      const found = blockAround(this.view, state.selection.main.head)
      if (!found) return Decoration.none
      const line = state.doc.lineAt(found.node.from)
      const builder = new RangeSetBuilder<Decoration>()
      builder.add(
        line.to,
        line.to,
        Decoration.widget({
          widget: new EditButton(found.node.from, found.kind),
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
        key: 'Mod-k e',
        run: view => {
          const found = blockAround(view, view.state.selection.main.head)
          if (!found) return false
          requestEdit(view.state.selection.main.head, found.kind)
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
