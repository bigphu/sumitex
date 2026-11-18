/**
 * The page heading while a folder is open (guide Phase 5), in place of the
 * folder's bare name: the path to it, each part a link up the tree, and how
 * many projects it holds, counting its subfolders.
 *
 *   Folders › Courses › CS101
 *   4 projects, including 2 in subfolders
 */
import classNames from 'classnames'
import type { Tag } from '../../../../../app/src/Features/Tags/types'
import { useContext } from 'react'
import { ProjectListContext } from '@/features/project-list/context/project-list-context'
import { parentOf } from './folder-tree'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export default function FolderTitle({
  tag,
  className,
}: {
  tag: Tag
  className?: string
}) {
  const context = useContext(ProjectListContext)
  // Outside the project list (some tests): just the name
  if (!context) {
    return (
      <h1
        id="main-content"
        tabIndex={-1}
        className={classNames('project-list-title', className)}
        translate="no"
      >
        {tag.name}
      </h1>
    )
  }
  const { tags, projectsPerTag, selectTag } = context

  const ancestors: Tag[] = []
  for (let cur = parentOf(tags, tag); cur && ancestors.length < tags.length; ) {
    const parent = tags.find(other => other._id === cur)
    if (!parent) break
    ancestors.unshift(parent)
    cur = parentOf(tags, parent)
  }

  const projects = projectsPerTag[tag._id] ?? []
  const direct = new Set(tag.project_ids ?? [])
  const inSubfolders = projects.filter(p => !direct.has(p.id)).length

  return (
    <div className={classNames('sx-folder-heading', className)}>
      <nav className="sx-folder-crumbs" aria-label="Folder path">
        <span className="sx-folder-crumb-root">Folders</span>
        {ancestors.map(parent => (
          <span key={parent._id} className="sx-folder-crumb">
            <span aria-hidden="true">›</span>
            <button
              type="button"
              translate="no"
              onClick={() => selectTag(parent._id)}
            >
              {parent.name}
            </button>
          </span>
        ))}
        <span aria-hidden="true">›</span>
      </nav>
      <h1
        id="main-content"
        tabIndex={-1}
        className="project-list-title sx-folder-name"
        translate="no"
      >
        {tag.name}
      </h1>
      <span className="sx-folder-summary">
        {plural(projects.length, 'project')}
        {inSubfolders > 0 && `, including ${inSubfolders} in subfolders`}
      </span>
    </div>
  )
}
