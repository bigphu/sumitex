/**
 * The dashboard sidebar's folders (guide Phase 5), in place of upstream's
 * flat tag list (project-list/components/sidebar/tags-list.tsx).
 *
 * - Folders show as a tree; a chevron folds a folder's subfolders away, and
 *   which ones are folded is remembered in this browser.
 * - Opening a folder lists its projects and those in its subfolders, with
 *   that total beside the name.
 * - Drag projects (a row, or every selected row) onto a folder to add them.
 *   Drag a folder onto another to move it inside, or onto the "Folders"
 *   heading to move it to the top. A drop that isn't allowed (inside
 *   itself, too deep) shows why and does nothing.
 * - Each folder's menu: New subfolder, Edit, Move to top level, Delete.
 *   Deleting a folder moves the folders inside it up a level.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import {
  CaretRight,
  DotsThreeVertical,
  Folder,
  FolderOpen,
  Folders,
  Plus,
  X,
} from '@phosphor-icons/react'
import {
  UNCATEGORIZED_KEY,
  useProjectListContext,
} from '@/features/project-list/context/project-list-context'
import useTag from '@/features/project-list/hooks/use-tag'
import { addProjectsToTag, moveTag } from '@/features/project-list/util/api'
import {
  OLDropdown,
  OLDropdownItem,
  OLDropdownMenu,
  OLDropdownToggle,
} from '@/shared/components/ol/ol-dropdown-menu'
import usePersistedState from '@/shared/hooks/use-persisted-state'
import { debugConsole } from '@/utils/debugging'
import { useFeatureFlag } from '@/shared/context/split-test-context'
import {
  canAddSubfolder,
  flattenFolders,
  folderAndDescendants,
  folderPath,
  moveProblem,
  parentOf,
  MAX_FOLDER_DEPTH,
} from './folder-tree'
import { PROJECTS_DRAG_TYPE, draggedProjects } from './drag-projects'

const FOLDER_DRAG_TYPE = 'application/x-sumitex-folder'

// The folder being dragged; dragover can't read the drag data itself
let draggedFolder: string | null = null

type DropState = { id: string; problem: string | null } | null

// The count on the right; the button's label says it to screen readers
function Count({ n }: { n: number }) {
  return (
    <span className="sx-folder-count" aria-hidden="true">
      {n}
    </span>
  )
}

export default function FolderList() {
  const { t } = useTranslation()
  const isSharedWorkspaceEnabled = useFeatureFlag('shared-workspace')
  const {
    tags,
    projectsPerTag,
    untaggedProjectsCount,
    selectedTagId,
    selectTag,
    moveTagInView,
    addProjectToTagInView,
  } = useProjectListContext()
  const {
    handleSelectTag,
    openCreateTagModal,
    handleEditTag,
    handleDeleteTag,
    CreateTagModal,
    EditTagModal,
    DeleteTagModal,
  } = useTag()

  const [collapsedList, setCollapsedList] = usePersistedState<string[]>(
    'sumitex.dashboard.collapsed-folders',
    []
  )
  const collapsed = useMemo(() => new Set(collapsedList), [collapsedList])
  const [hintDismissed, setHintDismissed] = usePersistedState<boolean>(
    'sumitex.dashboard.folder-hint-dismissed',
    false
  )
  const [drop, setDrop] = useState<DropState>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const toggle = useCallback(
    (id: string, open?: boolean) =>
      setCollapsedList(list => {
        const isOpen = !list.includes(id)
        if (open ?? !isOpen) return list.filter(other => other !== id)
        return [...list, id]
      }),
    [setCollapsedList]
  )

  // The open folder is never hidden inside a folded one
  useEffect(() => {
    if (!selectedTagId || selectedTagId === UNCATEGORIZED_KEY) return
    const tag = tags.find(tag => tag._id === selectedTagId)
    const ancestors: string[] = []
    for (let cur = tag ? parentOf(tags, tag) : null; cur; ) {
      if (ancestors.includes(cur)) break
      ancestors.push(cur)
      const parent = tags.find(tag => tag._id === cur)
      cur = parent ? parentOf(tags, parent) : null
    }
    if (ancestors.some(id => collapsed.has(id))) {
      setCollapsedList(list => list.filter(id => !ancestors.includes(id)))
    }
  }, [selectedTagId, tags, collapsed, setCollapsedList])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const rows = useMemo(() => flattenFolders(tags, collapsed), [tags, collapsed])

  const runMove = useCallback(
    (tagId: string, parentId: string | null) => {
      const problem = moveProblem(tags, tagId, parentId)
      if (problem) {
        if (problem !== 'It is already there') setNotice(problem)
        return
      }
      const tag = tags.find(tag => tag._id === tagId)
      const before = tag ? parentOf(tags, tag) : null
      moveTagInView(tagId, parentId)
      if (parentId) toggle(parentId, true)
      moveTag(tagId, parentId).catch(error => {
        debugConsole.error(error)
        moveTagInView(tagId, before)
        setNotice('Could not move the folder. Try again.')
      })
    },
    [tags, moveTagInView, toggle]
  )

  const addProjects = useCallback(
    (tagId: string, projectIds: string[]) => {
      const tag = tags.find(tag => tag._id === tagId)
      const missing = projectIds.filter(
        id => !(tag?.project_ids ?? []).includes(id)
      )
      if (missing.length === 0) return
      for (const id of missing) addProjectToTagInView(tagId, id)
      addProjectsToTag(tagId, missing).catch(error => {
        debugConsole.error(error)
        setNotice('Could not add to the folder. Try again.')
      })
    },
    [tags, addProjectToTagInView]
  )

  // Drag and drop: a target is a folder id, or null for the top level
  const dropHandlers = (target: string | null) => ({
    onDragOver: (event: React.DragEvent) => {
      const types = Array.from(event.dataTransfer.types)
      let problem: string | null = null
      if (types.includes(FOLDER_DRAG_TYPE) && draggedFolder) {
        problem = moveProblem(tags, draggedFolder, target)
        if (problem === 'It is already there') problem = ''
      } else if (!types.includes(PROJECTS_DRAG_TYPE) || target === null) {
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = problem === null ? 'move' : 'none'
      const id = target ?? 'top'
      if (drop?.id !== id || drop.problem !== problem) {
        setDrop({ id, problem })
        // Say why while the folder hovers where it can't go
        if (problem) setNotice(problem)
      }
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setDrop(null)
      }
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault()
      setDrop(null)
      const folder = event.dataTransfer.getData(FOLDER_DRAG_TYPE)
      if (folder) {
        runMove(folder, target)
        return
      }
      const projects = draggedProjects(event)
      if (projects.length && target) addProjects(target, projects)
    },
  })

  const dragFolder = (tagId: string) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      draggedFolder = tagId
      event.dataTransfer.setData(FOLDER_DRAG_TYPE, tagId)
      event.dataTransfer.effectAllowed = 'move'
    },
    onDragEnd: () => {
      draggedFolder = null
      setDrop(null)
    },
  })

  const dropClass = (id: string) =>
    classNames({
      'sx-drop': drop?.id === id && drop.problem === null,
      'sx-drop-bad': drop?.id === id && !!drop.problem,
    })

  return (
    <>
      <li
        className={classNames(
          'dropdown-header sx-folders-header',
          dropClass('top')
        )}
        data-testid="organize-projects"
        title={
          drop?.id === 'top' && drop.problem
            ? drop.problem
            : 'Drop a folder here to move it to the top level'
        }
        {...dropHandlers(null)}
      >
        <span className="sx-folders-title">
          <Folders aria-hidden="true" />
          {isSharedWorkspaceEnabled ? t('your_tags') : t('organize_tags')}
        </span>
        <button
          type="button"
          className="sx-folders-add"
          aria-label={t('new_tag')}
          title={t('new_tag')}
          onClick={() => openCreateTagModal(null)}
        >
          <Plus weight="bold" />
        </button>
      </li>
      {tags.length === 0 && (
        <li className="sx-folders-hint">
          No folders yet. Make one with <b>+</b>, then drag projects onto it.
        </li>
      )}
      {rows.map(({ tag, depth, hasChildren }) => {
        const isCollapsed = collapsed.has(tag._id)
        const nested = parentOf(tags, tag) !== null
        return (
          <li
            className={classNames(
              'tag sx-folder',
              { active: selectedTagId === tag._id },
              dropClass(tag._id)
            )}
            key={tag._id}
            style={{ '--sx-folder-depth': depth } as React.CSSProperties}
            title={
              drop?.id === tag._id ? (drop.problem ?? undefined) : undefined
            }
            {...dropHandlers(tag._id)}
          >
            {hasChildren ? (
              <button
                type="button"
                className="sx-folder-chevron"
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? 'Show' : 'Hide'} the folders in ${tag.name}`}
                onClick={() => toggle(tag._id)}
              >
                <CaretRight weight="bold" />
              </button>
            ) : (
              <span className="sx-folder-chevron" aria-hidden="true" />
            )}
            <button
              type="button"
              className="tag-name"
              translate="no"
              aria-label={`${tag.name} (${projectsPerTag[tag._id]?.length ?? 0})`}
              // The full path, for names cut short in a narrow sidebar
              title={folderPath(tags, tag._id)}
              onClick={e =>
                handleSelectTag(e as unknown as React.MouseEvent, tag._id)
              }
              {...dragFolder(tag._id)}
            >
              {/* Colour-coded: the folder's colour, as a soft duotone */}
              <span
                className={classNames('sx-folder-icon', {
                  'sx-folder-coloured': !!tag.color,
                })}
                style={tag.color ? { color: tag.color } : undefined}
              >
                {selectedTagId === tag._id ? (
                  <FolderOpen
                    className="tag-list-icon"
                    weight={tag.color ? 'duotone' : 'regular'}
                  />
                ) : (
                  <Folder
                    className="tag-list-icon"
                    weight={tag.color ? 'duotone' : 'regular'}
                  />
                )}
              </span>
              <span className="name">{tag.name}</span>
              <Count n={projectsPerTag[tag._id]?.length ?? 0} />
            </button>

            <OLDropdown align="end" className="tag-menu">
              <OLDropdownToggle
                aria-label={t('open_action_menu', { name: tag.name })}
                id={`${tag._id}-dropdown-toggle`}
                data-testid="tag-dropdown-toggle"
              >
                <DotsThreeVertical weight="bold" />
              </OLDropdownToggle>
              <OLDropdownMenu className="dropdown-menu-sm-width">
                <OLDropdownItem
                  as="li"
                  className="tag-action"
                  disabled={!canAddSubfolder(tags, tag._id)}
                  description={
                    canAddSubfolder(tags, tag._id)
                      ? undefined
                      : `Folders can be at most ${MAX_FOLDER_DEPTH} levels deep`
                  }
                  onClick={() => {
                    toggle(tag._id, true)
                    openCreateTagModal(tag._id)
                  }}
                >
                  New subfolder
                </OLDropdownItem>
                <OLDropdownItem
                  as="li"
                  className="tag-action"
                  onClick={e => handleEditTag(e, tag._id)}
                >
                  {t('edit')}
                </OLDropdownItem>
                {nested && (
                  <OLDropdownItem
                    as="li"
                    className="tag-action"
                    onClick={() => runMove(tag._id, null)}
                  >
                    Move to top level
                  </OLDropdownItem>
                )}
                <OLDropdownItem
                  as="li"
                  className="tag-action"
                  onClick={e => handleDeleteTag(e, tag._id)}
                  description={
                    folderAndDescendants(tags, tag._id).length > 1
                      ? 'Its folders move up a level'
                      : undefined
                  }
                >
                  {t('delete')}
                </OLDropdownItem>
              </OLDropdownMenu>
            </OLDropdown>
          </li>
        )
      })}
      {/* Below the tree, so rows don't shift under a drag */}
      {notice && (
        <li className="sx-folders-notice" role="status">
          {notice}
        </li>
      )}
      {tags.length > 0 && (
        <li
          className={`tag untagged ${
            selectedTagId === UNCATEGORIZED_KEY ? 'active' : ''
          }`}
        >
          <button
            type="button"
            className="tag-name"
            aria-label={`${t('uncategorized')} (${untaggedProjectsCount})`}
            onClick={() => selectTag(UNCATEGORIZED_KEY)}
          >
            <span className="name">{t('uncategorized')}</span>
            <Count n={untaggedProjectsCount} />
          </button>
        </li>
      )}
      {tags.length > 0 && !hintDismissed && (
        <li className="sx-folders-hint">
          Drag a project onto a folder to add it. Drag a folder onto another to
          nest it, up to {MAX_FOLDER_DEPTH} levels.
          <button
            type="button"
            className="sx-folders-hint-close"
            aria-label="Hide this tip"
            onClick={() => setHintDismissed(true)}
          >
            <X />
          </button>
        </li>
      )}
      <CreateTagModal id="create-tag-modal" />
      <EditTagModal id="edit-tag-modal" />
      <DeleteTagModal id="delete-tag-modal" />
    </>
  )
}
