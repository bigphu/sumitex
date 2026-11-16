/**
 * Sections in the palette (Ctrl+Shift+O, or type "@"): every \section,
 * \subsection … of the open file, from the stock outline, indented by
 * level, with file:line on the right (mockup frame 17). Picking one jumps
 * there. Figures, tables and other blocks join this list with the Outline
 * with blocks (guide 6c).
 *
 * Added to the palette's sources by one marked line in
 * features/command-palette/hooks/use-command-palette-sources.ts.
 */
import { useMemo } from 'react'
import { useOutlineContext } from '@/features/ide-react/context/outline-context'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import type {
  CommandPaletteSearchResult,
  CommandPaletteSource,
} from '@/features/command-palette/types'

/** Every word typed appears somewhere in the text */
export const matchesWords = (text: string, query: string) => {
  const lower = text.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(word => lower.includes(word))
}

export function useSectionsSource(): CommandPaletteSource {
  const { flatOutline, jumpToLine } = useOutlineContext()
  const { openDocName } = useEditorOpenDocContext()

  return useMemo(() => {
    const items = flatOutline?.items ?? []
    const minLevel = Math.min(...items.map(item => item.level))

    const toResult = (
      item: (typeof items)[number],
      score: number
    ): CommandPaletteSearchResult => ({
      title: item.title,
      onSelect: () => jumpToLine(item.line, false),
      score,
      eventSegmentation: { source: 'jump-to-line' },
      sumitex: {
        group: 'Sections in this file',
        glyph: '§',
        indent: Math.max(item.level - minLevel, 0),
        location: `${openDocName ?? ''}:${item.line}`,
      },
    })

    return {
      id: 'sumitex-sections',
      prefix: '@',
      prefixRequired: true,
      // In document order, so the list reads like the outline
      defaults: () =>
        items.map((item, index) => toResult(item, items.length - index)),
      search: query =>
        items
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => matchesWords(item.title, query))
          .map(({ item, index }) => toResult(item, items.length - index)),
    }
  }, [flatOutline, jumpToLine, openDocName])
}
