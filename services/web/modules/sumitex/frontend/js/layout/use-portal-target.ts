/**
 * Finds a stock element to portal SumiTeX controls into, and keeps finding
 * it as the stock UI mounts and unmounts it (the PDF pill, the Files header).
 *
 * One MutationObserver serves every caller. The page changes on every
 * keystroke in the editor, so the observer only looks again once per frame,
 * and a target that is still in the page is kept without a lookup.
 */
import { useEffect, useState } from 'react'

const listeners = new Set<() => void>()
let observer: MutationObserver | null = null
let frame = 0

function notifyAll() {
  frame = 0
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!observer) {
    observer = new MutationObserver(() => {
      if (!frame) frame = window.requestAnimationFrame(notifyAll)
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && observer) {
      observer.disconnect()
      observer = null
      if (frame) window.cancelAnimationFrame(frame)
      frame = 0
    }
  }
}

export function usePortalTarget(selector: string) {
  const [target, setTarget] = useState<Element | null>(() =>
    document.querySelector(selector)
  )

  useEffect(() => {
    const find = () =>
      setTarget(current =>
        current?.isConnected && current.matches(selector)
          ? current
          : document.querySelector(selector)
      )
    find()
    return subscribe(find)
  }, [selector])

  return target
}
