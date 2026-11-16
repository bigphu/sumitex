/**
 * Recently opened files, newest first, for the palette's "Recent files"
 * (mockup frame 2). Kept per project in this browser; the bridge records
 * each file as it opens.
 */
import { useEffect, useMemo } from 'react'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import { useEditorManagerContext } from '@/features/ide-react/context/editor-manager-context'
import { useFileTreeData } from '@/shared/context/file-tree-data-context'
import { useProjectContext } from '@/shared/context/project-context'
import { findInTree } from '@/features/file-tree/util/find-in-tree'
import type {
  CommandPaletteSearchResult,
  CommandPaletteSource,
} from '@/features/command-palette/types'

const MAX = 5
const storageKey = (projectId: string) => `sumitex.recent-files.${projectId}`

function readRecent(projectId: string): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey(projectId)) ?? '[]')
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

function writeRecent(projectId: string, ids: string[]) {
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(ids))
  } catch {
    // storage blocked: the palette just shows no recent files
  }
}

/** For the bridge: remember each file as it opens */
export function useRecordRecentFile() {
  const { projectId } = useProjectContext()
  const { currentDocumentId } = useEditorOpenDocContext()

  useEffect(() => {
    if (!currentDocumentId) return
    const ids = readRecent(projectId).filter(id => id !== currentDocumentId)
    writeRecent(projectId, [currentDocumentId, ...ids].slice(0, MAX))
  }, [projectId, currentDocumentId])
}

export function useRecentFilesSource(): CommandPaletteSource {
  const { projectId } = useProjectContext()
  const { fileTreeData } = useFileTreeData()
  const { openDocWithId } = useEditorManagerContext()

  return useMemo(() => {
    const defaults = (): CommandPaletteSearchResult[] => {
      if (!fileTreeData) return []
      return readRecent(projectId).flatMap((id, index) => {
        const found = findInTree(fileTreeData, id)
        if (!found || found.type !== 'doc') return []
        // path holds folder ids, from the root folder down
        const folder = found.path
          .slice(1)
          .map(folderId => findInTree(fileTreeData, folderId)?.entity.name)
          .join('/')
        return [
          {
            title: found.entity.name,
            description: folder || undefined,
            onSelect: async () => {
              await openDocWithId(found.entity._id)
            },
            score: MAX - index,
            eventSegmentation: { source: 'file' as const },
            sumitex: { group: 'Recent files' as const },
          },
        ]
      })
    }
    return { id: 'sumitex-recent-files', defaults, search: () => [] }
  }, [projectId, fileTreeData, openDocWithId])
}
