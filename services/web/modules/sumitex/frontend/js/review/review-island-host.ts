/**
 * Where the Review list renders. The right strip owns the island's DOM node;
 * the list itself renders from inside the editor (review-island.tsx), because
 * its cards need the editor's contexts, and is portaled into this node.
 */
let host: HTMLElement | null = null
const listeners = new Set<() => void>()

export const setReviewIslandHost = (element: HTMLElement | null) => {
  if (element === host) return
  host = element
  listeners.forEach(listener => listener())
}

export const subscribeReviewIslandHost = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getReviewIslandHost = () => host
