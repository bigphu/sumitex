/**
 * SumiTeX's own per-browser preferences. Each one is mirrored as a class on
 * <body> so the styles can follow it.
 */
import {
  getAccountMathRules,
  hasAccount,
  saveAccountMathRules,
} from './account-prefs'

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

// Math auto-expansion (editor/math-auto-expand.ts): on unless switched off
// (in this browser), and the user's own rules, one per line
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

// Your rules live with your account (account-prefs.ts). Rules kept in this
// browser before are moved there the first time they are read.
let movedToAccount = false

export const getMathRules = () => {
  const account = getAccountMathRules()
  if (account !== null) return account
  const local = mathRulesNow ?? (mathRulesNow = read(MATH_RULES_KEY) ?? '')
  if (hasAccount && local && !movedToAccount) {
    movedToAccount = true
    void saveAccountMathRules(local)
  }
  return local
}

export const setMathRules = (text: string) => {
  mathRulesNow = text
  write(MATH_RULES_KEY, text)
  if (hasAccount) void saveAccountMathRules(text)
}

// The live checks (Settings → Checks): on unless switched off, per browser
const CHECK_PACKAGES_KEY = 'sumitex.check.missing-packages'
const CHECK_PROJECT_KEY = 'sumitex.check.project'

let checkPackagesNow: boolean | null = null
let checkProjectNow: boolean | null = null

/** The missing-package linter (editor/missing-package-linter.ts) */
export const getCheckPackages = () =>
  checkPackagesNow ??
  (checkPackagesNow = read(CHECK_PACKAGES_KEY) !== 'false')

export const setCheckPackages = (on: boolean) => {
  checkPackagesNow = on
  write(CHECK_PACKAGES_KEY, String(on))
}

/** Labels, citations and files across the project (editor/project-checks.ts) */
export const getCheckProject = () =>
  checkProjectNow ?? (checkProjectNow = read(CHECK_PROJECT_KEY) !== 'false')

export const setCheckProject = (on: boolean) => {
  checkProjectNow = on
  write(CHECK_PROJECT_KEY, String(on))
}
