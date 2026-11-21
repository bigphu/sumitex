/**
 * The user's own folder order (FolderOrderRouter.mjs). The last known order
 * is kept in this browser so the list shows in place at once; the server's
 * copy replaces it when it arrives, and every change is saved to both.
 */
import { useCallback, useEffect } from 'react'
import usePersistedState from '@/shared/hooks/use-persisted-state'
import { getJSON, postJSON } from '@/infrastructure/fetch-json'
import { debugConsole } from '@/utils/debugging'

const PATH = '/sumitex/folders/order'

export function useFolderOrder() {
  const [order, setOrder] = usePersistedState<string[]>(
    'sumitex.dashboard.folder-order',
    []
  )

  useEffect(() => {
    let live = true
    getJSON<{ order: string[] }>(PATH)
      .then(({ order }) => {
        if (live && Array.isArray(order)) setOrder(order)
      })
      .catch(error => debugConsole.error(error))
    return () => {
      live = false
    }
  }, [setOrder])

  const saveOrder = useCallback(
    (next: string[]) => {
      setOrder(next)
      return postJSON(PATH, { body: { order: next } })
    },
    [setOrder]
  )

  return [order, saveOrder] as const
}
