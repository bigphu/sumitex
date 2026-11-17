/**
 * SumiTeX preferences kept with the user's account (user.ace on the server,
 * saved through /user/settings), so they follow you to any device:
 * - personal snippets: .sxs text, offered in every project
 *   (completions/personal-snippets.tsx)
 * - math shortcuts: your own rules for math auto-expansion
 *   (editor/math-auto-expand.ts); before they lived in the browser, and
 *   those are moved over the first time
 *
 * Anonymous visitors (link sharing) have no account: theirs stay in the
 * browser.
 */
import getMeta from '@/utils/meta'
import { postJSON } from '@/infrastructure/fetch-json'
import { debugConsole } from '@/utils/debugging'

// In the editor they come with the user's settings; on the account page,
// in a meta of their own
const settings = getMeta('ol-userSettings')
const accountPage = getMeta('ol-sumitexAccount')
export const hasAccount =
  Boolean(accountPage) ||
  (Boolean(getMeta('ol-user_id')) && !getMeta('ol-anonymous'))

let snippets = settings?.sumitexSnippets ?? accountPage?.snippets ?? ''
let mathRules: string | null =
  settings?.sumitexMathRules ?? accountPage?.mathRules ?? null
const listeners = new Set<() => void>()

const notify = () => listeners.forEach(listener => listener())

export const subscribeAccountPrefs = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

async function save(body: Record<string, string>) {
  if (!hasAccount) return false
  try {
    await postJSON('/user/settings', { body })
    return true
  } catch (error) {
    debugConsole.error('SumiTeX: could not save to your account', error)
    return false
  }
}

export const getPersonalSnippets = () => snippets

/** Save personal snippets; false if the account couldn't be reached */
export function savePersonalSnippets(text: string) {
  snippets = text
  notify()
  return save({ sumitexSnippets: text })
}

/** null when the account has none yet */
export const getAccountMathRules = () => (hasAccount ? mathRules : null)

export function saveAccountMathRules(text: string) {
  mathRules = text
  notify()
  return save({ sumitexMathRules: text })
}
