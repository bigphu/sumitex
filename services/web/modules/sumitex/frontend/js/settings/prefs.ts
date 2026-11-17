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

// Math auto-expansion (editor/math-auto-expand.ts): on unless switched off,
// and the user's own rules, one per line
const MATH_EXPAND_KEY = 'sumitex.math-auto-expand'
const MATH_RULES_KEY = 'sumitex.math-auto-expand-rules'

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked: the choice lasts until the page reloads
  }
  listeners.forEach(listener => listener())
}

let mathExpandNow: boolean | null = null
let mathRulesNow: string | null = null

export const getMathExpand = () =>
  mathExpandNow ?? (mathExpandNow = read(MATH_EXPAND_KEY) !== 'false')

export const setMathExpand = (on: boolean) => {
  mathExpandNow = on
  write(MATH_EXPAND_KEY, String(on))
}

export const getMathRules = () =>
  mathRulesNow ?? (mathRulesNow = read(MATH_RULES_KEY) ?? '')

export const setMathRules = (text: string) => {
  mathRulesNow = text
  write(MATH_RULES_KEY, text)
}
