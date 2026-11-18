import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectListContext } from '../../../context/project-list-context'
import ArchiveProjectsButton from './buttons/archive-projects-button'
import DownloadProjectsButton from './buttons/download-projects-button'
import ProjectToolsMoreDropdownButton from './buttons/project-tools-more-dropdown-button'
import TagsDropdown from './buttons/tags-dropdown'
import TrashProjectsButton from './buttons/trash-projects-button'
import UnarchiveProjectsButton from './buttons/unarchive-projects-button'
import UntrashProjectsButton from './buttons/untrash-projects-button'
import DeleteLeaveProjectsButton from './buttons/delete-leave-projects-button'
import LeaveProjectsButton from './buttons/leave-projects-button'
import DeleteProjectsButton from './buttons/delete-projects-button'
import OLButtonToolbar from '@/shared/components/ol/ol-button-toolbar'
import OLButtonGroup from '@/shared/components/ol/ol-button-group'
import RemoveFromFolderButton from '@modules/sumitex/frontend/js/folders/remove-from-folder-button' // SumiTeX

function ProjectTools() {
  const { t } = useTranslation()
  const { filter, selectedProjects } = useProjectListContext()

  return (
    <OLButtonToolbar aria-label={t('toolbar_selected_projects')}>
      {/* SumiTeX: how many are selected */}
      <span className="sx-selected-count" aria-live="polite">
        {selectedProjects.length} selected
      </span>
      <OLButtonGroup
        aria-label={t('toolbar_selected_projects_management_actions')}
      >
        <DownloadProjectsButton />
        {filter !== 'archived' && <ArchiveProjectsButton />}
        {filter !== 'trashed' && <TrashProjectsButton />}
      </OLButtonGroup>

      {(filter === 'trashed' || filter === 'archived') && (
        <OLButtonGroup aria-label={t('toolbar_selected_projects_restore')}>
          {filter === 'trashed' && <UntrashProjectsButton />}
          {filter === 'archived' && <UnarchiveProjectsButton />}
        </OLButtonGroup>
      )}

      {filter === 'trashed' && (
        <OLButtonGroup aria-label={t('toolbar_selected_projects_remove')}>
          <LeaveProjectsButton />
          <DeleteProjectsButton />
          <DeleteLeaveProjectsButton />
        </OLButtonGroup>
      )}

      {!['archived', 'trashed'].includes(filter) && <TagsDropdown />}
      {/* SumiTeX: in an open folder, take the selection out of it */}
      <RemoveFromFolderButton />

      {selectedProjects.length === 1 &&
        filter !== 'archived' &&
        filter !== 'trashed' && <ProjectToolsMoreDropdownButton />}
    </OLButtonToolbar>
  )
}

export default memo(ProjectTools)
