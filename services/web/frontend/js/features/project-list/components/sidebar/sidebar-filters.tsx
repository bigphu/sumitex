import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import {
  Filter,
  useProjectListContext,
} from '../../context/project-list-context'
import TagsList from './tags-list'
import ProjectsFilterMenu from '../projects-filter-menu'
import { Archive, Folder, User, Users } from '@phosphor-icons/react' // SumiTeX: an icon for each view
import { ActivePage } from '../../util/navigation-state'

type SidebarFilterProps = {
  filter: Filter
  text: React.ReactNode
  activePage: ActivePage
  icon?: React.ReactNode
}

export function SidebarFilter({
  filter,
  text,
  icon,
  activePage,
}: SidebarFilterProps) {
  const { selectFilter, filterProjectsCount } = useProjectListContext()
  const count = filterProjectsCount?.[filter] // SumiTeX

  return (
    <ProjectsFilterMenu filter={filter} activePage={activePage}>
      {isActive => (
        <li className={isActive ? 'active' : ''}>
          <button
            className={classNames('sidebar-filter-button', {
              'sidebar-filter-button-with-icon': !!icon,
            })}
            type="button"
            onClick={() => selectFilter(filter)}
          >
            {icon && <span className="icon">{icon}</span>}
            <span className="sx-view-label">{text}</span>
            {/* SumiTeX: the view's size, as the folders show theirs */}
            {count !== undefined && (
              <span className="sx-folder-count" aria-hidden="true">
                {count}
              </span>
            )}
          </button>
        </li>
      )}
    </ProjectsFilterMenu>
  )
}

export default function SidebarFilters({
  activePage,
}: {
  activePage: ActivePage
}) {
  const { t } = useTranslation()
  return (
    <ul className="list-unstyled project-list-filters">
      <SidebarFilter
        activePage={activePage}
        filter="all"
        text={t('projects')}
        icon={<Folder size={20} />}
      />
      <SidebarFilter
        activePage={activePage}
        filter="owned"
        text={t('your_projects')}
        icon={<User size={20} />}
      />
      <SidebarFilter
        activePage={activePage}
        filter="shared"
        text={t('shared_with_you')}
        icon={<Users size={20} />}
      />
      <SidebarFilter
        activePage={activePage}
        filter="archived"
        text={t('archived_projects')}
        icon={<Archive size={20} />}
      />
      <li aria-hidden="true">
        <hr />
      </li>
      <TagsList />
    </ul>
  )
}
