/**
 * Uploads pasted and dropped images for editor/image-paste.ts: into
 * images/ (the server makes the folder when it's missing), under a name
 * nothing there has yet, and as PNG when pdfLaTeX can't read the format.
 * The project's normal upload, as the file tree's Upload uses.
 */
import { useEffect } from 'react'
import getMeta from '@/utils/meta'
import { useProjectContext } from '@/shared/context/project-context'
import { useFileTreeData } from '@/shared/context/file-tree-data-context'
import type { Folder } from '../../../../../types/folder'
import { setImageUploader, type Uploaded } from '../editor/image-paste'
import { IMAGE_FOLDER, safeStem, uniqueName } from '../editor/image-paste-text'

// What pdfLaTeX (and the others) read as they are
const AS_IS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/pdf': 'pdf',
}

const extensionOf = (file: File) =>
  AS_IS[file.type] ??
  (/\.(png|jpe?g|pdf|eps)$/i.exec(file.name)?.[1].toLowerCase().replace('jpeg', 'jpg') ||
    null)

/** Any other image the browser can show, drawn into a PNG */
async function toPng(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    // An SVG may have no size of its own
    const width = image.naturalWidth || 1200
    const height = image.naturalHeight || 900
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(image, 0, 0, width, height)
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/png')
    )
    if (!blob) throw new Error('could not convert')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** The names already in images/, lower-cased */
function namesInImageFolder(root: Folder | undefined) {
  const folder = root?.folders.find(item => item.name === IMAGE_FOLDER)
  return new Set(
    folder
      ? [...folder.docs, ...folder.fileRefs, ...folder.folders].map(item =>
          item.name.toLowerCase()
        )
      : []
  )
}

async function uploadOne(
  projectId: string,
  rootId: string,
  name: string,
  blob: Blob
) {
  const form = new FormData()
  form.append('name', name)
  // From the root folder; the server makes images/ when it's missing
  form.append('relativePath', `${IMAGE_FOLDER}/${name}`)
  form.append('qqfile', blob, name)
  const response = await fetch(
    `/project/${projectId}/upload?folder_id=${rootId}`,
    {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': getMeta('ol-csrfToken') },
      body: form,
    }
  )
  const body = await response.json().catch(() => null)
  if (!response.ok || !body?.success) {
    const reason = body?.error
    throw new Error(
      reason === 'project_has_too_many_files'
        ? 'SumiTeX: This project has too many files to add the image.'
        : reason === 'file_too_large' || response.status === 413
          ? 'SumiTeX: The image is too large to upload.'
          : `upload failed (${response.status} ${reason ?? ''})`
    )
  }
}

export function useImageUpload() {
  const { projectId } = useProjectContext()
  const { fileTreeData } = useFileTreeData()

  useEffect(() => {
    if (!fileTreeData) return
    const root = fileTreeData
    // Names handed out but maybe not in the file tree yet (two quick pastes)
    const handedOut = new Set<string>()

    setImageUploader(async (files, pasted) => {
      const uploaded: Uploaded[] = []
      for (const file of files) {
        let blob: Blob = file
        let extension = extensionOf(file)
        if (!extension) {
          blob = await toPng(file).catch(() => {
            throw new Error(
              `SumiTeX: ${file.name || 'This image'} is in a format SumiTeX can’t read.`
            )
          })
          extension = 'png'
        }
        const stem = pasted ? 'pasted' : safeStem(file.name)
        const taken = new Set([...namesInImageFolder(root), ...handedOut])
        const name = uniqueName(stem, extension, taken, pasted)
        handedOut.add(name.toLowerCase())
        await uploadOne(projectId, root._id, name, blob)
        uploaded.push({
          path: `${IMAGE_FOLDER}/${name}`,
          stem: name.replace(/\.[^.]*$/, ''),
        })
      }
      return uploaded
    })
    return () => setImageUploader(null)
  }, [projectId, fileTreeData])
}
