/**
 * In an open folder, the toolbar for selected projects gets "Remove from
 * <folder>" (guide Phase 5): the projects leave that folder and its
 * subfolders, so they drop out of the view. They stay in other folders and
 * are not deleted.
 */
import { FolderMinus } from '@phosphor-icons/react'
import {
  UNCATEGORIZED_KEY,
  useProjectListContext,
} from '@/features/project-list/context/project-list-context'
import { removeProjectsFromTag } from '@/features/project-list/util/api'
import OLButton from '@/shared/components/ol/ol-button'
import { debugConsole } from '@/utils/debugging'
import { folderAndDescendants } from './folder-tree'

export default function RemoveFromFolderButton() {
  const {
    tags,
    selectedTagId,
    selectedProjects,
    removeProjectFromTagInView,
    addProjectToTagInView,
  } = useProjectListContext()

  const folder = tags.find(tag => tag._id === selectedTagId)
  if (!folder || selectedTagId === UNCATEGORIZED_KEY) return null

  const remove = () => {
    for (const id of folderAndDescendants(tags, folder._id)) {
      const tag = tags.find(tag => tag._id === id)
      const projectIds = selectedProjects
        .map(project => project.id)
        .filter(projectId => tag?.project_ids?.includes(projectId))
      if (projectIds.length === 0) continue
      for (const projectId of projectIds)
        removeProjectFromTagInView(id, projectId)
      removeProjectsFromTag(id, projectIds).catch(error => {
        debugConsole.error(error)
        for (const projectId of projectIds) addProjectToTagInView(id, projectId)
      })
    }
  }

  return (
    <OLButton
      variant="secondary"
      className="sx-remove-from-folder"
      onClick={remove}
      translate="no"
    >
      <FolderMinus aria-hidden="true" /> Remove from {folder.name}
    </OLButton>
  )
}
