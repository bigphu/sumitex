/**
 * Installing SumiTeX as an app (guide 1c). The browser fires
 * beforeinstallprompt when the page can be installed; keep it so the ensō
 * menu can offer "Install SumiTeX" and show the browser's own prompt.
 * Listening starts as soon as this module loads, because the event can fire
 * before the editor has drawn anything. Firefox never fires it, so there
 * SumiTeX stays a normal tab and no item shows.
 */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault() // offer it from the menu instead of the browser bar
  deferred = event as InstallPromptEvent
  notify()
})

window.addEventListener('appinstalled', () => {
  deferred = null
  notify()
})

export const canInstall = () => deferred !== null

export const subscribeInstall = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function installApp() {
  if (!deferred) return
  const event = deferred
  await event.prompt()
  await event.userChoice
  deferred = null // the browser gives one prompt per event
  notify()
}
