/**
 * The folders a project is in, as chips in the project list's Folders
 * column (guide Phase 5). A chip opens its folder; its × takes the project
 * out of that folder. The full path shows on hover.
 */
import { useTranslation } from 'react-i18next'
import { Folder, X } from '@phosphor-icons/react'
import { useProjectListContext } from '@/features/project-list/context/project-list-context'
import { removeProjectFromTag } from '@/features/project-list/util/api'
import { debugConsole } from '@/utils/debugging'
import { flattenFolders, folderPath } from './folder-tree'

export default function FolderChips({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const { tags, selectTag, removeProjectFromTagInView, addProjectToTagInView } =
    useProjectListContext()

  const inFolders = flattenFolders(tags)
    .map(({ tag }) => tag)
    .filter(tag => tag.project_ids?.includes(projectId))

  if (inFolders.length === 0) return null

  return (
    <span className="sx-folder-chips">
      {inFolders.map(tag => (
        <span
          className="sx-folder-chip"
          key={tag._id}
          title={folderPath(tags, tag._id)}
          translate="no"
        >
          <button
            type="button"
            className="sx-folder-chip-open"
            aria-label={t('select_tag', { tagName: tag.name })}
            onClick={() => selectTag(tag._id)}
          >
            <Folder
              aria-hidden="true"
              weight={tag.color ? 'duotone' : 'regular'}
              style={tag.color ? { color: tag.color } : undefined}
            />
            {tag.name}
          </button>
          <button
            type="button"
            className="sx-folder-chip-remove"
            aria-label={`Remove from ${tag.name}`}
            onClick={() => {
              removeProjectFromTagInView(tag._id, projectId)
              removeProjectFromTag(tag._id, projectId).catch(error => {
                debugConsole.error(error)
                addProjectToTagInView(tag._id, projectId)
              })
            }}
          >
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
    </span>
  )
}
