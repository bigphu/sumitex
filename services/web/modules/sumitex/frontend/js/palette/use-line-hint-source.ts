/**
 * ":" with nothing after it: a hint row instead of an empty list, with the
 * open file's line count and where the cursor is. The stock jump-to-line
 * source answers once a number is typed.
 */
import { useMemo } from 'react'
import { useEditorViewContext } from '@/features/ide-react/context/editor-view-context'
import type { CommandPaletteSource } from '@/features/command-palette/types'

export function useLineHintSource(): CommandPaletteSource {
  const { view } = useEditorViewContext()

  return useMemo(
    () => ({
      id: 'sumitex-line-hint',
      prefix: ':',
      prefixRequired: true,
      search: () => [],
      defaults: () => {
        if (!view) return []
        const { doc, selection } = view.state
        const line = doc.lineAt(selection.main.head).number
        return [
          {
            title: `Type a line number, e.g. :${Math.min(42, doc.lines)} or :${line},5 for a column`,
            description: `line ${line} of ${doc.lines}`,
            // Enter on the hint just closes the palette
            onSelect: () => view.focus(),
            score: 0,
            eventSegmentation: { source: 'jump-to-line' as const },
            sumitex: { group: 'Go to line' as const, glyph: ':' },
          },
        ]
      },
    }),
    [view]
  )
}
