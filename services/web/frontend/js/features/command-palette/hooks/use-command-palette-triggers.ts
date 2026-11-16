import useEventListener from '@/shared/hooks/use-event-listener'
import { Dispatch, SetStateAction, useCallback } from 'react'
import { isMac } from '@/shared/utils/os'
import {
  getPaletteMode,
  isPaletteOpen,
  setPaletteMode,
} from '@modules/sumitex/frontend/js/palette/palette-mode' // SumiTeX

const useCommandPaletteTriggers = (show: Dispatch<SetStateAction<boolean>>) => {
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const modifierKey = isMac ? event.metaKey : event.ctrlKey
      // SumiTeX: Ctrl+P files first, Ctrl+Shift+P commands, Ctrl+Shift+O
      // sections; another one while the palette is open switches over
      const key = event.key.toLowerCase()
      if (modifierKey && (key === 'p' || (key === 'o' && event.shiftKey))) {
        event.preventDefault()
        const mode =
          key === 'o' ? 'sections' : event.shiftKey ? 'commands' : 'files'
        const switching = isPaletteOpen() && getPaletteMode() !== mode
        setPaletteMode(mode)
        if (!switching) show(prev => !prev)
      }
    },
    [show]
  )

  useEventListener('keydown', onKeyDown)
}

export default useCommandPaletteTriggers
