/**
 * Narrow windows (guide 1d, step 8; mockup frame 8). Below 900px wide:
 * - Split is dropped: a split layout becomes Source, and the split comes
 *   back when the window is wide again.
 * - The side panels become drawers over the editor (shell/_narrow.scss);
 *   a click outside an open drawer closes it.
 * The <body> gets the class sx-narrow while this applies.
 */
import { useEffect, useState } from 'react'
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
