import { expect } from 'chai'
import type { Tag } from '../../../../../app/src/Features/Tags/types'
import {
  flattenFolders,
  reorderFolders,
} from '../../../frontend/js/folders/folder-tree'

// Ids are 24 hex characters, like Mongo's
const id = (n: number) => n.toString(16).padStart(24, '0')
const tag = (n: number, name: string, parent?: number) =>
  ({
    _id: id(n),
    name,
    user_id: 'u',
    project_ids: [],
    ...(parent ? { parent_id: id(parent) } : {}),
  }) as unknown as Tag

// Courses › (Week 1, Week 2), Archive, Personal
const tags = [
  tag(1, 'Courses'),
  tag(2, 'Week 2', 1),
  tag(3, 'Week 1', 1),
  tag(4, 'Personal'),
  tag(5, 'Archive'),
]
const names = (order: string[] = []) =>
  flattenFolders(tags, new Set(), order).map(row => row.tag.name)

describe('SumiTeX folders: order', function () {
  it('sorts by name when there is no order', function () {
    expect(names()).to.deep.equal([
      'Archive',
      'Courses',
      'Week 1',
      'Week 2',
      'Personal',
    ])
  })

  it('follows the saved order, and puts unlisted folders after by name', function () {
    expect(names([id(4), id(1), id(2)])).to.deep.equal([
      'Personal',
      'Courses',
      'Week 2',
      'Week 1',
      'Archive',
    ])
  })

  it('moves a top-level folder to the very top and the very bottom', function () {
    // "Personal" sorts last by name among Archive/Courses/Personal
    expect(names(reorderFolders(tags, [], id(4), 'first'))[0]).to.equal(
      'Personal'
    )
    const last = names(reorderFolders(tags, [], id(5), 'last'))
    expect(last[last.length - 1]).to.equal('Archive')
  })

  it('puts a folder before or after another among its siblings', function () {
    expect(names(reorderFolders(tags, [], id(2), 'before', id(3)))).to.deep.equal(
      ['Archive', 'Courses', 'Week 2', 'Week 1', 'Personal']
    )
    expect(names(reorderFolders(tags, [], id(5), 'after', id(4)))).to.deep.equal(
      ['Courses', 'Week 1', 'Week 2', 'Personal', 'Archive']
    )
  })

  it('keeps a folder after its target even when the target has subfolders', function () {
    // Archive after Courses: after Courses' whole subtree, before Personal
    expect(names(reorderFolders(tags, [], id(5), 'after', id(1)))).to.deep.equal(
      ['Courses', 'Week 1', 'Week 2', 'Archive', 'Personal']
    )
  })
})
