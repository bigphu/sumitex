/**
 * Sections and blocks in the palette (Ctrl+Shift+O, or type "@"): every
 * \section, \subsection … of the open file, from the stock outline,
 * indented by level; then the figures, tables, equations, lists, code,
 * theorems and notes of every .tex file in the project
 * (project-blocks.ts), with file:line on the right (mockup frame 17).
 * A first word that names a kind narrows to it: "@fig pipe". Picking one
 * opens its file there.
 *
 * Added to the palette's sources by one marked line in
 * features/command-palette/hooks/use-command-palette-sources.ts.
 */
import { useMemo } from 'react'
import { useOutlineContext } from '@/features/ide-react/context/outline-context'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import { useEditorManagerContext } from '@/features/ide-react/context/editor-manager-context'
import { useFileTreePathContext } from '@/features/file-tree/contexts/file-tree-path'
import { projectBlocks, splitQuery, type ProjectBlock } from './project-blocks'
import { BLOCK_KINDS, type BlockKind } from '../outline/block-types'
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

// What each kind shows in the palette's narrow glyph column
const GLYPHS: Record<BlockKind, string> = {
  figure: '▣',
  table: '▤',
  graph: '◇',
  list: '≡',
  equation: '∑',
  code: '{}',
  theorem: '◆',
  note: '✎',
}

export function useSectionsSource(): CommandPaletteSource {
  const { flatOutline, jumpToLine } = useOutlineContext()
  const { openDocName } = useEditorOpenDocContext()
  const { openDocWithId } = useEditorManagerContext()
  const { findEntityByPath } = useFileTreePathContext()

  return useMemo(() => {
    const blockResult = (
      { path, block }: ProjectBlock,
      open: boolean,
      score: number
    ): CommandPaletteSearchResult => ({
      title: block.title,
      description: BLOCK_KINDS[block.kind].name,
      onSelect: () => {
        if (open) return jumpToLine(block.line, false)
        const found = findEntityByPath(path)
        if (found) void openDocWithId(found.entity._id, { gotoLine: block.line })
      },
      score,
      eventSegmentation: { source: 'jump-to-line' },
      sumitex: {
        group: 'Blocks in this project',
        glyph: GLYPHS[block.kind],
        location: `${open ? (openDocName ?? '') : path}:${block.line}`,
      },
    })

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
      // In document order, so the list reads like the outline; then the
      // open file's blocks
      defaults: () => {
        const blocks = projectBlocks().filter(({ path }) => path === projectBlocks()[0]?.path)
        return [
          ...items.map((item, index) => toResult(item, items.length + blocks.length - index)),
          ...blocks.map((found, index) => blockResult(found, true, blocks.length - index)),
        ]
      },
      search: query => {
        const { kind, words } = splitQuery(query)
        const sections = kind
          ? []
          : items
              .map((item, index) => ({ item, index }))
              .filter(({ item }) => matchesWords(item.title, query))
              .map(({ item, index }) => toResult(item, 10000 + items.length - index))
        const all = projectBlocks()
        const openPath = all[0]?.path
        const blocks = all
          .filter(({ block }) => !kind || block.kind === kind)
          .filter(({ block }) =>
            matchesWords(`${block.title} ${BLOCK_KINDS[block.kind].name} ${block.label ?? ''}`, words)
          )
          // This file's first, then the rest in path order
          .map((found, index) => blockResult(found, found.path === openPath, all.length - index))
        return [...sections, ...blocks]
      },
    }
  }, [flatOutline, jumpToLine, openDocName, openDocWithId, findEntityByPath])
}
