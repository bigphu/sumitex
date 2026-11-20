/**
 * The tab row has no scrollbar, so it shows a soft fade on the side where
 * more tabs are hidden. This sets data-more="left" | "right" | "both" on the
 * row (no attribute when everything fits); the fade itself is CSS
 * (_tabbar.scss).
 */
import { RefObject, useEffect } from 'react'

const EDGE = 2 // px of slack, so a sub-pixel scroll position counts as "at the end"

export function useTabOverflow(container: RefObject<HTMLElement>, shown: boolean) {
  useEffect(() => {
    const root = container.current
    if (!root) return

    let row: HTMLElement | null = null
    const update = () => {
      if (!row) return
      const { scrollLeft, scrollWidth, clientWidth } = row
      const left = scrollLeft > EDGE
      const right = scrollLeft + clientWidth < scrollWidth - EDGE
      const more = left && right ? 'both' : left ? 'left' : right ? 'right' : ''
      if (more) row.dataset.more = more
      else delete row.dataset.more
    }

    const resize = new ResizeObserver(update)
    // Tabs opening and closing change the row's width without a resize
    const children = new MutationObserver(update)

    const attach = () => {
      const next = root.querySelector<HTMLElement>('.editor-tabs-row')
      if (next === row) return
      if (row) {
        row.removeEventListener('scroll', update)
        resize.unobserve(row)
        children.disconnect()
      }
      row = next
      if (!row) return
      row.addEventListener('scroll', update, { passive: true })
      resize.observe(row)
      children.observe(row, { childList: true, subtree: true })
      update()
    }

    // The row mounts with the tabs, which can come after the bar itself
    const mount = new MutationObserver(attach)
    mount.observe(root, { childList: true, subtree: true })
    attach()

    return () => {
      mount.disconnect()
      children.disconnect()
      resize.disconnect()
      row?.removeEventListener('scroll', update)
    }
  }, [container, shown]) // the bar is unmounted in Zen; attach again after
}
