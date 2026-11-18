/**
 * Dragging projects from the dashboard list onto a folder (folder-list.tsx).
 * A row drags itself, or every selected row when it is one of them.
 */
export const PROJECTS_DRAG_TYPE = 'application/x-sumitex-projects'

export function startProjectDrag(
  event: React.DragEvent,
  projectId: string,
  projectName: string,
  selectedIds: Set<string>
) {
  const ids = selectedIds.has(projectId) ? [...selectedIds] : [projectId]
  event.dataTransfer.setData(PROJECTS_DRAG_TYPE, JSON.stringify(ids))
  event.dataTransfer.setData(
    'text/plain',
    ids.length === 1 ? projectName : `${ids.length} projects`
  )
  event.dataTransfer.effectAllowed = 'copyMove'

  // A small label to drag, rather than a picture of the whole row
  const label = document.createElement('div')
  label.className = 'sx-project-drag-label'
  label.textContent = ids.length === 1 ? projectName : `${ids.length} projects`
  document.body.appendChild(label)
  event.dataTransfer.setDragImage(label, 12, 12)
  window.setTimeout(() => label.remove(), 0)
}

/** The project ids being dropped, or none */
export function draggedProjects(event: React.DragEvent): string[] {
  try {
    const ids = JSON.parse(event.dataTransfer.getData(PROJECTS_DRAG_TYPE))
    return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []
  } catch {
    return []
  }
}
