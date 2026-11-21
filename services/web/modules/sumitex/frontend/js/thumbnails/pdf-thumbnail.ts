/**
 * After a compile, draw the PDF's first page small and send it to the
 * server (app/src/ThumbnailRouter.mjs), so the dashboard can show it beside
 * the project's name.
 *
 * Runs in the editor (called from layout/right-strip.tsx), for people who
 * can edit the project. It waits a moment after each new PDF so the viewer
 * loads first, draws page 1 with pdf.js, and sends it only when it differs
 * from the last one sent.
 */
import { useEffect } from 'react'
import { useDetachCompileContext as useCompileContext } from '@/shared/context/detach-compile-context'
import { useProjectContext } from '@/shared/context/project-context'
import { usePermissionsContext } from '@/features/ide-react/context/permissions-context'
import { postJSON } from '@/infrastructure/fetch-json'

// Twice the hover preview's width (shell/_dashboard.scss), for sharp screens
const WIDTH = 360
const DELAY = 2000

// The last image sent per project, while this page is open
const lastSent = new Map<string, string>()

async function drawFirstPage(pdfUrl: string, cancelled: () => boolean) {
  const { loadPdfDocumentFromUrl } = await import(
    '@/features/pdf-preview/util/pdf-js'
  )
  const pdf = await loadPdfDocumentFromUrl(pdfUrl).promise
  try {
    if (cancelled()) return null
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({
      scale: WIDTH / page.getViewport({ scale: 1 }).width,
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) return null
    // Pages without a background are transparent: put them on white
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: context, viewport }).promise
    if (cancelled()) return null
    const webp = canvas.toDataURL('image/webp', 0.8)
    // A browser without WebP output falls back to PNG; JPEG is smaller then
    return webp.startsWith('data:image/webp')
      ? webp
      : canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    pdf.destroy()
  }
}

export function usePdfThumbnail() {
  const { pdfUrl } = useCompileContext()
  const { projectId } = useProjectContext()
  const { write } = usePermissionsContext()

  useEffect(() => {
    if (!pdfUrl || !write) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      drawFirstPage(pdfUrl, () => cancelled)
        .then(image => {
          if (!image || cancelled || lastSent.get(projectId) === image) return
          return postJSON(`/sumitex/project/${projectId}/thumbnail`, {
            body: { image },
          }).then(() => {
            lastSent.set(projectId, image)
          })
        })
        .catch(() => {
          // No thumbnail this time; the dashboard keeps the last one
        })
    }, DELAY)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [pdfUrl, projectId, write])
}
