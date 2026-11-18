/**
 * Dashboard folders (guide Phase 5): a folder is a tag with an optional
 * parent_id, so folders nest. These helpers turn the flat tag list into a
 * tree. A parent that no longer exists (or a loop, which the server never
 * allows) counts as the top, so old and odd data still shows.
 *
 * Opening a folder lists its own projects and those in its subfolders.
 */
import type { Tag } from '../../../../../app/src/Features/Tags/types'

// Matches the server (TagsHandler MAX_FOLDER_DEPTH)
export const MAX_FOLDER_DEPTH = 5

export type FolderRow = { tag: Tag; depth: number; hasChildren: boolean }

const byName = (a: Tag, b: Tag) =>
  (a.name ?? '').localeCompare(b.name ?? '', undefined, {
    sensitivity: 'base',
    numeric: true,
  })

/** The id of the folder a tag sits in, or null at the top */
export function parentOf(tags: Tag[], tag: Tag): string | null {
  const parentId = tag.parent_id
  if (!parentId || parentId === tag._id) return null
  return tags.some(other => other._id === parentId) ? parentId : null
}

/** Folder id → its subfolders, sorted by name; null holds the top level */
export function childrenMap(tags: Tag[]) {
  const map = new Map<string | null, Tag[]>()
  for (const tag of tags) {
    const parent = parentOf(tags, tag)
    map.set(parent, [...(map.get(parent) ?? []), tag])
  }
  for (const list of map.values()) list.sort(byName)
  return map
}

/** Folders in tree order, with their depth (0 at the top) */
export function flattenFolders(
  tags: Tag[],
  collapsed: Set<string> = new Set()
): FolderRow[] {
  const children = childrenMap(tags)
  const rows: FolderRow[] = []
  const seen = new Set<string>()
  // Folders inside a folded one are walked too, but not listed
  const walk = (parent: string | null, depth: number, shown: boolean) => {
    for (const tag of children.get(parent) ?? []) {
      if (seen.has(tag._id)) continue
      seen.add(tag._id)
      const kids = children.get(tag._id) ?? []
      if (shown) rows.push({ tag, depth, hasChildren: kids.length > 0 })
      walk(tag._id, depth + 1, shown && !collapsed.has(tag._id))
    }
  }
  walk(null, 0, true)
  // Anything left over sits in a loop: show it at the top
  for (const tag of tags) {
    if (!seen.has(tag._id)) {
      seen.add(tag._id)
      rows.push({ tag, depth: 0, hasChildren: false })
    }
  }
  return rows
}

/** A folder and every folder inside it, at any depth */
export function folderAndDescendants(tags: Tag[], tagId: string): string[] {
  const children = childrenMap(tags)
  const ids: string[] = []
  const walk = (id: string) => {
    if (ids.includes(id)) return
    ids.push(id)
    for (const child of children.get(id) ?? []) walk(child._id)
  }
  walk(tagId)
  return ids
}

/** The projects in a folder or its subfolders */
export function folderProjectIds(tags: Tag[], tagId: string): Set<string> {
  const ids = new Set<string>()
  for (const id of folderAndDescendants(tags, tagId)) {
    const tag = tags.find(tag => tag._id === id)
    for (const projectId of tag?.project_ids ?? []) ids.add(projectId)
  }
  return ids
}

/** 1 for a top-level folder */
export function folderDepth(tags: Tag[], tagId: string): number {
  let depth = 0
  for (
    let cur: string | null = tagId;
    cur && depth <= tags.length;
    cur = parentOf(tags, tags.find(tag => tag._id === cur)!)
  ) {
    if (!tags.some(tag => tag._id === cur)) break
    depth++
  }
  return depth
}

/** How many levels a folder and its subfolders take up */
export function folderHeight(tags: Tag[], tagId: string): number {
  const children = childrenMap(tags)
  const height = (id: string, guard: number): number =>
    guard > tags.length
      ? 1
      : 1 +
        Math.max(
          0,
          ...(children.get(id) ?? []).map(child => height(child._id, guard + 1))
        )
  return height(tagId, 0)
}

/** Why a folder can't go inside `parentId` (null: the top), or null if it can */
export function moveProblem(
  tags: Tag[],
  tagId: string,
  parentId: string | null
): string | null {
  const tag = tags.find(tag => tag._id === tagId)
  if (!tag) return 'That folder no longer exists'
  if (parentOf(tags, tag) === parentId) return 'It is already there'
  if (!parentId) return null
  if (folderAndDescendants(tags, tagId).includes(parentId)) {
    return 'A folder cannot go inside itself'
  }
  if (
    folderDepth(tags, parentId) + folderHeight(tags, tagId) >
    MAX_FOLDER_DEPTH
  ) {
    return `Folders can be at most ${MAX_FOLDER_DEPTH} levels deep`
  }
  return null
}

/** Whether a new folder may go inside `parentId` */
export const canAddSubfolder = (tags: Tag[], parentId: string) =>
  folderDepth(tags, parentId) < MAX_FOLDER_DEPTH

/** "Courses › CS101", for labels and menus */
export function folderPath(tags: Tag[], tagId: string): string {
  const names: string[] = []
  for (let cur: string | null = tagId; cur && names.length <= tags.length; ) {
    const tag = tags.find(tag => tag._id === cur)
    if (!tag) break
    names.unshift(tag.name)
    cur = parentOf(tags, tag)
  }
  return names.join(' › ')
}
