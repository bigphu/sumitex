import { useTranslation } from 'react-i18next'
import MaterialIcon from '../../../shared/components/material-icon'
import { getTagColor } from '../util/tag'
import {
  UNCATEGORIZED_KEY,
  useProjectListContext,
} from '../context/project-list-context'
import useTag from '../hooks/use-tag'
import { flattenFolders } from '@modules/sumitex/frontend/js/folders/folder-tree' // SumiTeX
import { Tag } from '../../../../../app/src/Features/Tags/types'
import { OLDropdownItem } from '@/shared/components/ol/ol-dropdown-menu'

type TagsListProps = {
  onTagClick?: () => void
}

function TagsList({ onTagClick }: TagsListProps) {
  const { t } = useTranslation()
  const {
    tags,
    untaggedProjectsCount,
    selectedTagId,
    selectTag,
    projectsPerTag, // SumiTeX
  } = useProjectListContext()

  const {
    handleSelectTag,
    openCreateTagModal,
    handleManageTag,
    CreateTagModal,
    ManageTagModal,
  } = useTag()

  const handleClick = (e: React.MouseEvent, tag: Tag) => {
    handleSelectTag(e, tag._id)
    onTagClick?.()
  }

  return (
    <>
      <>
        {/* SumiTeX: folders in tree order, indented */}
        {flattenFolders(tags).map(({ tag, depth }) => (
          <li
            role="none"
            className="position-relative sx-folder-item"
            key={tag._id}
            style={{ '--sx-folder-depth': depth } as React.CSSProperties}
          >
            <OLDropdownItem
              as="button"
              tabIndex={-1}
              onClick={e => handleClick(e as unknown as React.MouseEvent, tag)}
              leadingIcon={
                <span style={{ color: getTagColor(tag) }}>
                  <MaterialIcon type="label" className="align-text-top" />
                </span>
              }
              trailingIcon={selectedTagId === tag._id ? 'check' : undefined}
              active={selectedTagId === tag._id}
            >
              <span className="project-menu-item-tag-name text-truncate">
                {tag.name}&nbsp;({projectsPerTag[tag._id]?.length ?? 0})
              </span>
            </OLDropdownItem>
            <OLDropdownItem
              as="button"
              tabIndex={-1}
              className="project-menu-item-edit-btn"
              onClick={e => {
                e.stopPropagation()
                handleManageTag(e, tag._id)
              }}
              aria-label={t('edit_tag')}
            >
              <MaterialIcon type="edit" className="align-text-top" />
            </OLDropdownItem>
          </li>
        ))}
        <li role="none">
          <OLDropdownItem
            as="button"
            tabIndex={-1}
            onClick={() => selectTag(UNCATEGORIZED_KEY)}
            trailingIcon={
              selectedTagId === UNCATEGORIZED_KEY ? 'check' : undefined
            }
            active={selectedTagId === UNCATEGORIZED_KEY}
          >
            {t('uncategorized')}&nbsp;({untaggedProjectsCount})
          </OLDropdownItem>
        </li>
        <li role="none">
          <OLDropdownItem
            as="button"
            tabIndex={-1}
            onClick={e => {
              e.stopPropagation()
              openCreateTagModal()
            }}
            leadingIcon="add"
          >
            {t('new_tag')}
          </OLDropdownItem>
        </li>
      </>
      <CreateTagModal id="create-tag-modal-dropdown" disableCustomColor />
      <ManageTagModal id="manage-tag-modal-dropdown" />
    </>
  )
}

export default TagsList
