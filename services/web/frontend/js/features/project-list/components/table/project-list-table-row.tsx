import { memo } from 'react'
import InlineTags from './cells/inline-tags'
import OwnerCell from './cells/owner-cell'
import LastUpdatedCell from './cells/last-updated-cell'
import ActionsCell from './cells/actions-cell'
import ActionsDropdown from '../dropdown/actions-dropdown'
import { getOwnerName } from '../../util/project'
import { Project } from '../../../../../../types/project/dashboard/api'
import { ProjectCheckbox } from './project-checkbox'
import { ProjectListOwnerName } from '@/features/project-list/components/table/project-list-owner-name'
import { useProjectListContext } from '../../context/project-list-context' // SumiTeX
import { startProjectDrag } from '@modules/sumitex/frontend/js/folders/drag-projects' // SumiTeX
import FolderChips from '@modules/sumitex/frontend/js/folders/folder-chips' // SumiTeX
import ProjectThumbnail from '@modules/sumitex/frontend/js/thumbnails/project-thumbnail' // SumiTeX

type ProjectListTableRowProps = {
  project: Project
  selected: boolean
}
function ProjectListTableRow({ project, selected }: ProjectListTableRowProps) {
  const ownerName = getOwnerName(project)
  const { selectedProjectIds } = useProjectListContext() // SumiTeX

  return (
    <tr
      className={selected ? 'table-active' : undefined}
      // SumiTeX: drag onto a folder in the sidebar to add it there
      draggable
      onDragStart={event =>
        startProjectDrag(event, project.id, project.name, selectedProjectIds)
      }
    >
      <td className="dash-cell-checkbox d-none d-md-table-cell">
        <ProjectCheckbox projectId={project.id} projectName={project.name} />
      </td>
      <td className="dash-cell-name">
        <ProjectThumbnail projectId={project.id} /> {/* SumiTeX */}
        <a href={`/project/${project.id}`} translate="no">
          {project.name}
        </a>{' '}
        {/* SumiTeX: wide screens list folders in their own column */}
        <InlineTags className="d-none d-md-inline d-lg-none" projectId={project.id} />
      </td>
      <td className="dash-cell-date-owner pb-0 d-md-none">
        <LastUpdatedCell project={project} />
        {ownerName ? <ProjectListOwnerName ownerName={ownerName} /> : null}
      </td>
      <td className="dash-cell-owner d-none d-md-table-cell">
        <OwnerCell project={project} />
      </td>
      <td className="dash-cell-date d-none d-md-table-cell">
        <LastUpdatedCell project={project} />
      </td>
      {/* SumiTeX: the folders this project is in */}
      <td className="dash-cell-folders d-none d-lg-table-cell">
        <FolderChips projectId={project.id} />
      </td>
      <td className="dash-cell-tag pt-0 d-md-none">
        <InlineTags projectId={project.id} />
      </td>
      <td className="dash-cell-actions">
        <div className="d-none d-lg-block">
          <ActionsCell project={project} />
        </div>
        <div className="d-lg-none">
          <ActionsDropdown project={project} />
        </div>
      </td>
    </tr>
  )
}
export default memo(ProjectListTableRow)
