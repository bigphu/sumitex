/**
 * SumiTeX's own per-browser preferences. Each one is mirrored as a class on
 * <body> so the styles can follow it.
 */
const CODE_TOOLBAR_KEY = 'sumitex.code-formatting-toolbar'
const listeners = new Set<() => void>()

export const getCodeToolbar = () => {
  try {
    return localStorage.getItem(CODE_TOOLBAR_KEY) === 'true'
  } catch {
    return false
  }
}

export const applyCodeToolbarClass = () =>
  document.body.classList.toggle('sx-code-toolbar', getCodeToolbar())

export const setCodeToolbar = (on: boolean) => {
  try {
    localStorage.setItem(CODE_TOOLBAR_KEY, String(on))
  } catch {
    // storage blocked: the choice lasts until the page reloads
  }
  document.body.classList.toggle('sx-code-toolbar', on)
  listeners.forEach(listener => listener())
}

export const subscribePrefs = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
