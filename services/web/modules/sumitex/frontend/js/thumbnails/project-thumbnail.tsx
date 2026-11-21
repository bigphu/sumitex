/**
 * A project's first page, small, beside its name on the dashboard
 * (project-list-table-row.tsx, a marked line); hovering it shows it larger.
 * A project not compiled since thumbnails came in shows a blank page.
 * The editor makes the image (pdf-thumbnail.ts). Styles: shell/_dashboard.scss.
 */
import { useState } from 'react'
import { useThumbnailUrl } from './thumbnail-store'

export default function ProjectThumbnail({ projectId }: { projectId: string }) {
  const url = useThumbnailUrl(projectId)
  const [failed, setFailed] = useState(false)
  const show = url && !failed

  return (
    <span
      className={show ? 'sx-thumb' : 'sx-thumb sx-thumb-blank'}
      aria-hidden="true"
    >
      {show && (
        <>
          <img
            src={url}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false} // dragging the row moves the project to a folder
            onError={() => setFailed(true)}
          />
          <span className="sx-thumb-preview">
            <img
              src={url}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </span>
        </>
      )}
    </span>
  )
}
