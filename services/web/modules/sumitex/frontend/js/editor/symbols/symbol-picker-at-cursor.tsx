/**
 * The symbol picker at the cursor in the editor (Ctrl+K M, or the
 * palette's "Insert symbol"). In math the symbol goes in as it is; in
 * text it goes in wrapped in dollars, as inline math. A symbol from
 * amssymb loads the package too.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { mathContextAt } from '../math-context'
import { requestAddPackage } from '../add-package'
import SymbolPicker from './symbol-picker'
import { symbolText, type MathSymbol } from './symbol-data'
import { packageNeeded } from './symbol-package'

export const OPEN_SYMBOLS_EVENT = 'sumitex:open-symbols'

const DOLLAR = '$'

/** The text to insert at `pos`, and where the cursor goes in it */
export function insertion(view: EditorView, pos: number, symbol: MathSymbol) {
  const after = view.state.sliceDoc(pos, pos + 1)
  let text = symbolText(symbol.tex, after)
  // \sqrt{} and the like: the cursor in the empty {}
  const empty = text.endsWith('{}')
  let cursor = empty ? text.length - 1 : text.length
  if (mathContextAt(view.state, pos) !== 'math') {
    text = DOLLAR + text + DOLLAR
    cursor = empty ? cursor + 1 : text.length
  }
  return { text, cursor }
}

export default function SymbolPickerAtCursor({ view }: { view: EditorView }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN_SYMBOLS_EVENT, show)
    return () => window.removeEventListener(OPEN_SYMBOLS_EVENT, show)
  }, [])

  // Under the cursor, kept in the window
  useLayoutEffect(() => {
    const box = ref.current
    if (!open || !box) return
    const coords = view.coordsAtPos(view.state.selection.main.head)
    const top = coords ? coords.bottom + 6 : 120
    const left = coords ? coords.left : 120
    box.style.top = `${Math.max(8, Math.min(top, window.innerHeight - box.offsetHeight - 12))}px`
    box.style.left = `${Math.max(8, Math.min(left, window.innerWidth - box.offsetWidth - 12))}px`
  }, [open, view])

  // A click elsewhere closes it
  useEffect(() => {
    if (!open) return
    const down = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [open])

  if (!open) return null

  const close = () => {
    setOpen(false)
    view.focus()
  }

  const pick = (symbol: MathSymbol) => {
    const { from, to } = view.state.selection.main
    const { text, cursor } = insertion(view, from, symbol)
    const needed = symbol.package
      ? packageNeeded(view.state.doc.toString(), symbol.package)
      : null
    const changes = view.state.changes(
      needed && needed !== 'main'
        ? [{ from, to, insert: text }, needed]
        : [{ from, to, insert: text }]
    )
    view.dispatch({
      changes,
      // Past a package line added above it, the cursor still lands right
      selection: EditorSelection.cursor(changes.mapPos(from, -1) + cursor),
      userEvent: 'input.sumitex-symbol',
    })
    close()
    if (needed === 'main' && symbol.package) void requestAddPackage(symbol.package)
  }

  return createPortal(
    <div ref={ref} className="sx-symbols-popup" role="dialog" aria-label="Insert symbol">
      <SymbolPicker onPick={pick} onClose={close} />
    </div>,
    document.body
  )
}
