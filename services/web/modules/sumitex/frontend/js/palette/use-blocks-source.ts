/**
 * Blocks in the palette (type "!"): the figures, tables, equations,
 * lists, code, theorems and notes of every .tex file in the project
 * (project-blocks.ts), this file's first, with the Outline's icons and
 * file:line on the right. A first word that names a kind narrows to it:
 * "!fig pipe", "!eq". Picking one opens its file at the block.
 */
import { useMemo } from 'react'
import { useOutlineContext } from '@/features/ide-react/context/outline-context'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import { useEditorManagerContext } from '@/features/ide-react/context/editor-manager-context'
import { useFileTreePathContext } from '@/features/file-tree/contexts/file-tree-path'
import type {
  CommandPaletteSearchResult,
  CommandPaletteSource,
} from '@/features/command-palette/types'
import { BLOCK_KINDS } from '../outline/block-types'
import { matchesWords } from './use-sections-source'
import { projectBlocks, splitQuery, type ProjectBlock } from './project-blocks'

/** The icon a block has in the Outline */
export const blockIcon = ({ block }: ProjectBlock) =>
  block.name === 'enumerate' ? 'format_list_numbered' : BLOCK_KINDS[block.kind].icon

export function useBlocksSource(): CommandPaletteSource {
  const { jumpToLine } = useOutlineContext()
  const { openDocName } = useEditorOpenDocContext()
  const { openDocWithId } = useEditorManagerContext()
  const { findEntityByPath } = useFileTreePathContext()

  return useMemo(() => {
    const toResult = (found: ProjectBlock, open: boolean, score: number): CommandPaletteSearchResult => ({
      title: found.block.title,
      description: BLOCK_KINDS[found.block.kind].name,
      onSelect: () => {
        if (open) return jumpToLine(found.block.line, false)
        const entity = findEntityByPath(found.path)
        if (entity) void openDocWithId(entity.entity._id, { gotoLine: found.block.line })
      },
      score,
      eventSegmentation: { source: 'jump-to-line' },
      sumitex: {
        group: 'Blocks in this project',
        icon: blockIcon(found),
        location: `${open ? (openDocName ?? '') : found.path}:${found.block.line}`,
      },
    })

    const results = (query: string) => {
      const { kind, words } = splitQuery(query)
      const all = projectBlocks()
      const openPath = all[0]?.path
      return all
        .filter(({ block }) => !kind || block.kind === kind)
        .filter(({ block }) =>
          matchesWords(`${block.title} ${BLOCK_KINDS[block.kind].name} ${block.label ?? ''}`, words)
        )
        .map((found, index) => toResult(found, found.path === openPath, all.length - index))
    }

    return {
      id: 'sumitex-blocks',
      prefix: '!',
      prefixRequired: true,
      defaults: () => results(''),
      search: results,
    }
  }, [jumpToLine, openDocName, openDocWithId, findEntityByPath])
}
