/**
 * "Collapse all folders" in the Files panel header (mockup frame 1).
 * Click collapses every folder; Alt+click expands every folder.
 *
 * Each folder keeps its open state in localStorage (folder.<id>.expanded)
 * and listens for changes to it (one marked line in file-tree-folder.tsx),
 * so writing the keys and announcing them updates the open folders.
 * Portaled into the stock Files header, after its action buttons.
 */
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import { useFileTreeData } from '@/shared/context/file-tree-data-context'
import { useFileTreeOpenContext } from '@/features/ide-react/context/file-tree-open-context'
import localStorage from '@/infrastructure/local-storage'
import type { Folder } from '../../../../../types/folder'
import { usePortalTarget } from '../layout/use-portal-target'

// The header itself, after the stock action buttons: the mockup puts
// Collapse all last
const TARGET = '.file-tree-toolbar'

const folderIds = (folder: Folder): string[] =>
  folder.folders.flatMap(child => [child._id, ...folderIds(child)])

const setAllFolders = (root: Folder, expanded: boolean) => {
  for (const id of folderIds(root)) {
    const key = `folder.${id}.expanded`
    localStorage.setItem(key, expanded)
    // The same event another tab would send; open folders listen for it
    window.dispatchEvent(new StorageEvent('storage', { key }))
  }
}

const CollapseIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m7 20 5-5 5 5" />
    <path d="m7 4 5 5 5-5" />
  </svg>
)

export default function FileTreeExtras() {
  const target = usePortalTarget(TARGET)
  const { fileTreeData } = useFileTreeData()
  const { fileTreeExpanded, expandFileTree } = useFileTreeOpenContext()

  // The label no longer collapses the tree (shell/_sidepanel.scss); if it
  // gets collapsed anyway (from the keyboard), open it again
  useEffect(() => {
    if (!fileTreeExpanded) expandFileTree()
  }, [fileTreeExpanded, expandFileTree])

  if (!target || !fileTreeData) return null

  return createPortal(
    <OLTooltip
      id="sx-collapse-all-folders"
      description="Collapse all folders · Alt+click expands all"
      overlayProps={{ placement: 'bottom' }}
    >
      <button
        type="button"
        className="btn file-tree-toolbar-action-button sx-collapse-all"
        aria-label="Collapse all folders"
        onClick={event => setAllFolders(fileTreeData, event.altKey)}
      >
        <CollapseIcon />
      </button>
    </OLTooltip>,
    target
  )
}
