/** Open state, tab and height of the log panel (log-panel.tsx). */
export type LogTab = 'problems' | 'log'

let open = false
let tab: LogTab = 'problems'
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

export const getLogPanelOpen = () => open
export const getLogPanelTab = () => tab

export const setLogPanel = (next: { open?: boolean; tab?: LogTab }) => {
  if (next.open !== undefined) open = next.open
  if (next.tab !== undefined) tab = next.tab
  notify()
}

export const toggleLogPanel = () => setLogPanel({ open: !open })

export const subscribeLogPanel = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const HEIGHT_KEY = 'sumitex.log-panel.height'

export const getLogPanelHeight = () => {
  try {
    const value = Number(localStorage.getItem(HEIGHT_KEY))
    return value >= 120 ? value : 250
  } catch {
    return 250
  }
}

export const saveLogPanelHeight = (height: number) => {
  try {
    localStorage.setItem(HEIGHT_KEY, String(Math.round(height)))
  } catch {
    // storage blocked: the height lasts until reload
  }
}
