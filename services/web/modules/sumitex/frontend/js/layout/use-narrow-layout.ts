/**
 * Narrow windows (guide 1d, step 8; mockup frame 8). Below 900px wide:
 * - Split is dropped: a split layout becomes Source, and the split comes
 *   back when the window is wide again.
 * - The side panels become drawers over the editor (shell/_narrow.scss);
 *   a click outside an open drawer closes it.
 * The <body> gets the class sx-narrow while this applies.
 */
import { useEffect, useRef, useState } from 'react'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useRailContext } from '@/features/ide-react/context/rail-context'

export const NARROW_WIDTH = 900
const PREV_LAYOUT_KEY = 'sumitex.narrow.prev-layout'

const isNarrowNow = () => window.innerWidth < NARROW_WIDTH

export function useIsNarrow() {
  const [narrow, setNarrow] = useState(isNarrowNow)
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${NARROW_WIDTH - 1}px)`)
    const onChange = () => setNarrow(query.matches)
    onChange()
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return narrow
}

export function useNarrowLayout() {
  const narrow = useIsNarrow()
  const { pdfLayout, changeLayout, focusMode } = useLayoutContext()
  const { isOpen, setIsOpen } = useRailContext()

  useEffect(() => {
    document.body.classList.toggle('sx-narrow', narrow)
    return () => document.body.classList.remove('sx-narrow')
  }, [narrow])

  // Drop Split while narrow, and bring it back afterwards. Zen manages the
  // layout itself, so leave it alone then.
  useEffect(() => {
    if (focusMode) return
    try {
      if (narrow && pdfLayout === 'sideBySide') {
        localStorage.setItem(PREV_LAYOUT_KEY, 'sideBySide')
        changeLayout('flat', 'editor')
      } else if (!narrow && localStorage.getItem(PREV_LAYOUT_KEY)) {
        localStorage.removeItem(PREV_LAYOUT_KEY)
        changeLayout('sideBySide')
      }
    } catch {
      // storage blocked: Split simply doesn't come back by itself
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow])

  // A click outside the open left drawer closes it
  useEffect(() => {
    if (!narrow || !isOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element
      if (
        target.closest?.(
          '.ide-rail, [data-panel-id^="ide-redesign-sidebar-panel-"], .dropdown-menu, .modal'
        )
      ) {
        return
      }
      setIsOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [narrow, isOpen, setIsOpen])

  return narrow
}

/**
 * Laptop-sized windows (below 1500px wide): the side panel (Files, Outline,
 * …) starts closed, and closes when the window shrinks below that, so the
 * code keeps its width. The left strip's icons still open it, and it stays
 * open once opened by hand. When the window grows past 1500px again, a
 * panel this closed comes back; one closed by hand stays closed.
 */
export const COMPACT_WIDTH = 1500

// Kept across reloads: the panel's open state is saved, so after a reload a
// panel closed for the width would otherwise look closed by hand
const CLOSED_FOR_WIDTH_KEY = 'sumitex.side-panel-closed-for-width'

const readClosedForWidth = () => {
  try {
    return localStorage.getItem(CLOSED_FOR_WIDTH_KEY) === '1'
  } catch {
    return false
  }
}

const writeClosedForWidth = (value: boolean) => {
  try {
    if (value) localStorage.setItem(CLOSED_FOR_WIDTH_KEY, '1')
    else localStorage.removeItem(CLOSED_FOR_WIDTH_KEY)
  } catch {
    // storage blocked: a widened window just won't reopen the panel
  }
}

export function useCompactSidePanel() {
  const { isOpen, setIsOpen } = useRailContext()
  const { focusMode } = useLayoutContext()
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen
  const focusRef = useRef(focusMode)
  focusRef.current = focusMode

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${COMPACT_WIDTH - 1}px)`)
    const apply = () => {
      if (focusRef.current) return // Zen lays the page out itself
      if (query.matches) {
        if (isOpenRef.current) {
          writeClosedForWidth(true)
          setIsOpen(false)
        }
      } else if (readClosedForWidth()) {
        writeClosedForWidth(false)
        setIsOpen(true)
      }
    }
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [setIsOpen])

  // Opened by hand while narrow: it's the user's choice now
  useEffect(() => {
    if (isOpen) writeClosedForWidth(false)
  }, [isOpen])
}
