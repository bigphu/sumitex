/**
 * Drag table columns in Visual mode (features list 10, step 2; decided 20
 * Nov 2026): the grey bar above each column of the Visual table (the
 * stock column selector) is the grip. A click still selects the column;
 * dragging it sideways shows where it will land, and letting go moves the
 * column there, in every row and in the column spec, in one undo step
 * (table-columns.ts). When it can't (a merged cell, a short row), a short
 * message says why. Esc cancels. In Code mode, Alt+←/→ does the same.
 *
 * The Visual table is Overleaf's own component; this only listens to its
 * selector bars, so none of its code changes.
 */
import { EditorView, ViewPlugin } from '@codemirror/view'
import { moveColumnTo } from './table-columns'
import { flashMessage } from './flash-message'

// How far the pointer moves before a press becomes a drag, in pixels
const DRAG_AFTER = 6

type Press = {
  pointerId: number
  x: number
  table: HTMLElement
  selectors: HTMLElement[]
  index: number
  target: number
  dragging: boolean
  indicator: HTMLElement | null
}

export const tableGrip = () => [
  ViewPlugin.fromClass(
    class {
      press: Press | null = null

      constructor(readonly view: EditorView) {
        view.contentDOM.addEventListener('pointerdown', this.down, true)
      }

      down = (event: PointerEvent) => {
        if (event.button !== 0 || this.view.state.readOnly) return
        const selector =
          event.target instanceof HTMLElement &&
          event.target.closest<HTMLElement>('.column-selector')
        const table = selector && selector.closest<HTMLElement>('.table-generator')
        if (!selector || !table) return
        const selectors = [
          ...(selector.parentElement?.querySelectorAll<HTMLElement>(
            '.column-selector'
          ) ?? []),
        ]
        const index = selectors.indexOf(selector)
        if (index < 0 || selectors.length < 2) return
        this.press = {
          pointerId: event.pointerId,
          x: event.clientX,
          table,
          selectors,
          index,
          target: index,
          dragging: false,
          indicator: null,
        }
        window.addEventListener('pointermove', this.move, true)
        window.addEventListener('pointerup', this.up, true)
        window.addEventListener('pointercancel', this.cancel, true)
        window.addEventListener('keydown', this.key, true)
      }

      move = (event: PointerEvent) => {
        const press = this.press
        if (!press || event.pointerId !== press.pointerId) return
        if (!press.dragging) {
          if (Math.abs(event.clientX - press.x) < DRAG_AFTER) return
          press.dragging = true
          press.indicator = document.createElement('div')
          press.indicator.className = 'sx-column-drop'
          document.body.append(press.indicator)
          document.body.classList.add('sx-column-dragging')
        }
        event.preventDefault()
        // Slot k: before column k (k = count: after the last one)
        const rects = press.selectors.map(s => s.getBoundingClientRect())
        let slot = rects.length
        for (let k = 0; k < rects.length; k++) {
          if (event.clientX < rects[k].left + rects[k].width / 2) {
            slot = k
            break
          }
        }
        press.target = slot > press.index ? slot - 1 : slot
        const edge =
          slot < rects.length ? rects[slot].left : rects[rects.length - 1].right
        const box = press.table.getBoundingClientRect()
        const indicator = press.indicator!
        indicator.style.left = `${edge - 1}px`
        indicator.style.top = `${box.top}px`
        indicator.style.height = `${box.height}px`
        indicator.hidden = press.target === press.index
      }

      up = (event: PointerEvent) => {
        const press = this.press
        if (!press || event.pointerId !== press.pointerId) return
        this.cancel()
        if (!press.dragging || press.target === press.index) return
        const at = this.view.posAtDOM(press.table)
        const result = moveColumnTo(
          this.view.state,
          at,
          press.index,
          press.target
        )
        if ('error' in result) {
          flashMessage(this.view, result.error)
        } else if (result.changes) {
          this.view.dispatch(result)
        }
      }

      key = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.press?.dragging) {
          event.preventDefault()
          event.stopPropagation()
          this.cancel()
        }
      }

      cancel = () => {
        this.press?.indicator?.remove()
        this.press = null
        document.body.classList.remove('sx-column-dragging')
        window.removeEventListener('pointermove', this.move, true)
        window.removeEventListener('pointerup', this.up, true)
        window.removeEventListener('pointercancel', this.cancel, true)
        window.removeEventListener('keydown', this.key, true)
      }

      destroy() {
        this.cancel()
        this.view.contentDOM.removeEventListener('pointerdown', this.down, true)
      }
    }
  ),
  EditorView.baseTheme({
    '.table-generator .column-selector': {
      cursor: 'grab',
    },
  }),
]
