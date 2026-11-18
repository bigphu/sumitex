// SumiTeX: dashboard folders (nested tags), guide Phase 5
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expect } from 'chai'
import fetchMock from 'fetch-mock'
import TagsList from '../../../../../../frontend/js/features/project-list/components/sidebar/tags-list'
import { projectsData } from '../../fixtures/projects-data'
import { renderWithProjectListContext } from '../../helpers/render-with-context'
import {
  flattenFolders,
  folderProjectIds,
  moveProblem,
} from '../../../../../../modules/sumitex/frontend/js/folders/folder-tree'

// Courses › CS101 › Week 1, and Notes on its own
const tags = [
  { _id: 'courses', user_id: 'u', name: 'Courses', project_ids: [] },
  {
    _id: 'cs101',
    user_id: 'u',
    name: 'CS101',
    parent_id: 'courses',
    project_ids: [projectsData[0].id],
  },
  {
    _id: 'week1',
    user_id: 'u',
    name: 'Week 1',
    parent_id: 'cs101',
    project_ids: [projectsData[1].id],
  },
  {
    _id: 'notes',
    user_id: 'u',
    name: 'Notes',
    parent_id: 'gone', // its parent was deleted elsewhere: top level
    project_ids: [projectsData[0].id],
  },
]

describe('SumiTeX folder tree', function () {
  it('lists folders in tree order with their depth', function () {
    expect(
      flattenFolders(tags).map(({ tag, depth }) => `${depth}:${tag.name}`)
    ).to.deep.equal(['0:Courses', '1:CS101', '2:Week 1', '0:Notes'])
  })

  it('hides the folders inside a folded one', function () {
    expect(
      flattenFolders(tags, new Set(['cs101'])).map(({ tag }) => tag.name)
    ).to.deep.equal(['Courses', 'CS101', 'Notes'])
  })

  it('counts a folder’s projects with its subfolders’', function () {
    expect([...folderProjectIds(tags, 'courses')]).to.have.members([
      projectsData[0].id,
      projectsData[1].id,
    ])
  })

  it('refuses to put a folder inside itself', function () {
    expect(moveProblem(tags, 'courses', 'week1')).to.equal(
      'A folder cannot go inside itself'
    )
    expect(moveProblem(tags, 'week1', null)).to.equal(null)
  })
})

describe('<TagsList /> as folders', function () {
  beforeEach(async function () {
    global.localStorage.clear()
    window.metaAttributesCache.set('ol-tags', tags)
    window.metaAttributesCache.set('ol-ExposedSettings', { isOverleaf: true })
    fetchMock.post('/tag', {
      _id: 'week2',
      name: 'Week 2',
      parent_id: 'cs101',
      project_ids: [],
    })
    fetchMock.post('express:/tag/:tagId/projects', 200)
    fetchMock.post('express:/tag/:tagId/move', 204)

    renderWithProjectListContext(<TagsList />)
    await fetchMock.callHistory.flush(true)
    await waitFor(
      () => expect(fetchMock.callHistory.called('/api/project')).to.be.true
    )
  })

  afterEach(function () {
    fetchMock.removeRoutes().clearHistory()
  })

  it('shows the tree, with totals that include subfolders', async function () {
    await screen.findByRole('button', { name: 'Courses (2)' })
    await screen.findByRole('button', { name: 'CS101 (2)' })
    await screen.findByRole('button', { name: 'Week 1 (1)' })
    const depths = Array.from(document.querySelectorAll('li.sx-folder')).map(
      li => (li as HTMLElement).style.getPropertyValue('--sx-folder-depth')
    )
    expect(depths).to.deep.equal(['0', '1', '2', '0'])
  })

  it('folds a folder away', async function () {
    const toggle = await screen.findByRole('button', {
      name: 'Hide the folders in Courses',
    })
    fireEvent.click(toggle)
    expect(screen.queryByRole('button', { name: 'CS101 (2)' })).to.be.null
  })

  it('creates a subfolder from the menu', async function () {
    const cs101 = await screen.findByRole('button', { name: 'CS101 (2)' })
    fireEvent.click(
      within(cs101.closest('li') as HTMLElement).getByTestId(
        'tag-dropdown-toggle'
      )
    )
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'New subfolder' })
    )
    const modal = screen.getAllByRole('dialog', { hidden: false })[0]
    within(modal).getByText('in Courses › CS101', { exact: false })
    fireEvent.change(within(modal).getByRole('textbox'), {
      target: { value: 'Week 2' },
    })
    fireEvent.click(within(modal).getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(fetchMock.callHistory.called('/tag')).to.be.true)
    const body = JSON.parse(
      fetchMock.callHistory.lastCall('/tag')?.options.body as string
    )
    expect(body).to.include({ name: 'Week 2', parentId: 'cs101' })
    await screen.findByRole('button', { name: 'Week 2 (0)' })
  })

  it('moves a nested folder to the top level', async function () {
    const week1 = await screen.findByRole('button', { name: 'Week 1 (1)' })
    fireEvent.click(
      within(week1.closest('li') as HTMLElement).getByTestId(
        'tag-dropdown-toggle'
      )
    )
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Move to top level' })
    )
    await waitFor(
      () => expect(fetchMock.callHistory.called('/tag/week1/move')).to.be.true
    )
    await screen.findByRole('button', { name: 'CS101 (1)' })
  })
})
