/**
 * Paste or drop an image into the editor and it becomes a figure, with no
 * dialog (features list, "Image paste and drag", decided 20 Nov 2026):
 *
 * - The image uploads to images/ in the project: a pasted one as
 *   pasted-1.png, pasted-2.png…, a dropped one under its own name made
 *   safe for LaTeX ("Kết quả.PNG" → ket-qua.png). Nothing is overwritten.
 * - WebP, GIF, SVG, BMP… go in as PNG (pdfLaTeX takes PNG, JPEG and PDF).
 * - While it uploads, "Uploading image…" marks the place.
 * - The figure goes in on lines of its own, a blank line either side,
 *   written as the \fig snippet writes it, with a label of its own and the
 *   caption selected to type over. Several dropped images: several figures.
 * - graphicx is loaded if it isn't: in the same change in a file with its
 *   own preamble, else in the main file first (editor/add-package.ts).
 * - While the cursor is in a new figure, a small bar above it sets the
 *   width: ¼ · ½ · ¾ · Full. It goes once the cursor leaves the figure.
 *
 * Text pasted along with an image (from Word, a web page) stays a text
 * paste, as before. Uploading is the bridge's job (files/use-image-upload.ts),
 * which knows the project and its files.
 */
import {
  EditorState,
  Prec,
  StateEffect,
  StateField,
} from '@codemirror/state'
import {
  Decoration,
  EditorView,
  showTooltip,
  Tooltip,
  WidgetType,
} from '@codemirror/view'
import { debugConsole } from '@/utils/debugging'
import { preambleOf, stripComments } from '../diagnostics/preamble'
import { getProjectPreamble, wasJustAdded } from '../diagnostics/preamble-store'
import { packageInsertion, requestAddPackage } from './add-package'
import { flashMessage } from './flash-message'
import {
  CAPTION_PLACEHOLDER,
  figureBlock,
  figureLabel,
  labelsIn,
  placeFigures,
  widthIn,
} from './image-paste-text'

/** An image in the project once uploaded: its path and its name's stem */
export type Uploaded = { path: string; stem: string }

type Uploader = (files: File[], pasted: boolean) => Promise<Uploaded[]>

// The bridge supplies it (it knows the project and its files)
let uploader: Uploader | null = null
export const setImageUploader = (next: Uploader | null) => {
  uploader = next
}

// How long to wait for a chapter to come back after graphicx went into the
// main file
const RETURN_TIMEOUT_MS = 5000

const isImage = (file: File) =>
  file.type.startsWith('image/') ||
  file.type === 'application/pdf' ||
  /\.(eps|pdf)$/i.test(file.name)

// ------------------------------------------------------------- uploading mark

type Pending = { id: number; pos: number; count: number }

const addPending = StateEffect.define<Pending>({
  map: (value, changes) => ({ ...value, pos: changes.mapPos(value.pos) }),
})
const removePending = StateEffect.define<number>()

class UploadingWidget extends WidgetType {
  constructor(readonly count: number) {
    super()
  }

  eq(other: UploadingWidget) {
    return other.count === this.count
  }

  toDOM() {
    const dom = document.createElement('span')
    dom.className = 'sx-image-uploading'
    dom.setAttribute('role', 'status')
    dom.textContent =
      this.count > 1 ? `Uploading ${this.count} images…` : 'Uploading image…'
    return dom
  }
}

const pendingField = StateField.define<Pending[]>({
  create: () => [],
  update(value, tr) {
    let next = tr.docChanged
      ? value.map(item => ({ ...item, pos: tr.changes.mapPos(item.pos) }))
      : value
    for (const effect of tr.effects) {
      if (effect.is(addPending)) next = [...next, effect.value]
      if (effect.is(removePending))
        next = next.filter(item => item.id !== effect.value)
    }
    return next
  },
  provide: field =>
    EditorView.decorations.from(field, items =>
      Decoration.set(
        items.map(item =>
          Decoration.widget({
            widget: new UploadingWidget(item.count),
            side: 1,
          }).range(item.pos)
        ),
        true
      )
    ),
})

// -------------------------------------------------------------- the size bar

// The figures put in here; each shows its size bar while the cursor is in
// it, and drops out once the cursor has been in it and left
type Inserted = { from: number; to: number; visited: boolean }

const addInserted = StateEffect.define<Inserted[]>()

const SIZES: { label: string; value: string }[] = [
  { label: '¼', value: '0.25' },
  { label: '½', value: '0.5' },
  { label: '¾', value: '0.75' },
  { label: 'Full', value: '1' },
]

function sizeBar(state: EditorState, figure: Inserted): Tooltip | null {
  const text = state.sliceDoc(figure.from, figure.to)
  const width = widthIn(text)
  if (!width) return null
  return {
    pos: figure.from,
    above: true,
    create(view) {
      const dom = document.createElement('div')
      dom.className = 'sx-image-size'
      const title = document.createElement('span')
      title.className = 'sx-image-size-title'
      title.textContent = 'Image width'
      dom.append(title)
      for (const size of SIZES) {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = size.label
        button.title =
          size.value === '1' ? 'The full text width' : `${size.label} of the text width`
        button.setAttribute('aria-pressed', String(Number(width.value) === Number(size.value)))
        // Keep the focus (and the cursor) in the editor
        button.addEventListener('mousedown', event => event.preventDefault())
        button.addEventListener('click', () => {
          const current = view.state.field(insertedField, false)
          const live = current?.find(item => item.from === figure.from)
          if (!live) return
          const found = widthIn(view.state.sliceDoc(live.from, live.to))
          if (!found) return
          const insert =
            size.value === '1' ? 'width=\\linewidth' : `width=${size.value}\\linewidth`
          view.dispatch({
            changes: {
              from: live.from + found.from,
              to: live.from + found.to,
              insert,
            },
            userEvent: 'input.sumitex-image-width',
          })
        })
        dom.append(button)
      }
      return { dom }
    },
  }
}

const insertedField = StateField.define<Inserted[]>({
  create: () => [],
  update(value, tr) {
    let next = tr.docChanged
      ? value.map(item => ({
          from: tr.changes.mapPos(item.from, 1),
          to: tr.changes.mapPos(item.to, -1),
          visited: item.visited,
        }))
      : value
    for (const effect of tr.effects) {
      if (effect.is(addInserted)) next = [...next, ...effect.value]
    }
    if (next.length && (tr.selection || tr.docChanged)) {
      const head = tr.newSelection.main.head
      next = next
        .filter(item => item.to > item.from)
        .flatMap(item => {
          const inside = head >= item.from && head <= item.to
          if (inside) return [{ ...item, visited: true }]
          return item.visited ? [] : [item]
        })
    }
    return next
  },
  provide: field =>
    showTooltip.computeN([field], state => {
      const head = state.selection.main.head
      const figure = state
        .field(field)
        .find(item => head >= item.from && head <= item.to)
      return [figure ? sizeBar(state, figure) : null]
    }),
})

// ------------------------------------------------------------- the insertion

let nextId = 0

const hasOwnPreamble = (text: string) =>
  /\\documentclass/.test(stripComments(preambleOf(text)))

/** In a chapter: whether the main file still has to load graphicx */
function chapterNeedsGraphicx(text: string) {
  if (hasOwnPreamble(text) || wasJustAdded('graphicx')) return false
  const preamble = getProjectPreamble().preamble
  return !preamble?.loaded.has('graphicx')
}

async function backInChapter(view: EditorView, text: string) {
  for (let waited = 0; waited < RETURN_TIMEOUT_MS; waited += 50) {
    if (view.state.doc.toString() === text) return true
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  return view.state.doc.toString() === text
}

function insertFigures(view: EditorView, id: number, images: Uploaded[]) {
  const state = view.state
  const pending = state.field(pendingField, false)?.find(item => item.id === id)
  // The file was switched while uploading: the images are in the project,
  // but there's no place left to put them
  if (!pending) return false
  const text = state.doc.toString()
  const labels = new Set(labelsIn(text))
  const blocks = images.map(image => {
    const label = figureLabel(image.stem, labels)
    labels.add(label)
    return figureBlock(image.path, label)
  })
  const place = placeFigures(state, pending.pos, blocks)
  const graphicx = hasOwnPreamble(text) ? packageInsertion(text, 'graphicx') : null
  const changes = state.changes(
    graphicx
      ? [graphicx, { from: place.from, to: place.to, insert: place.insert }]
      : [{ from: place.from, to: place.to, insert: place.insert }]
  )
  // Where the inserted text starts in the new document
  const start = changes.mapPos(place.from, -1) + (place.start - place.from)
  const figures: Inserted[] = []
  let offset = start
  for (const block of blocks) {
    figures.push({ from: offset, to: offset + block.length, visited: false })
    offset += block.length + 2
  }
  const captionAt =
    start + blocks[0].indexOf(`\\caption{${CAPTION_PLACEHOLDER}}`) + '\\caption{'.length
  view.dispatch({
    changes,
    selection: { anchor: captionAt, head: captionAt + CAPTION_PLACEHOLDER.length },
    effects: [removePending.of(id), addInserted.of(figures)],
    scrollIntoView: true,
    userEvent: 'input.sumitex-image',
  })
  view.focus()
  return true
}

async function addImages(
  view: EditorView,
  files: File[],
  pasted: boolean,
  pos: number
) {
  if (!uploader) return
  const upload = uploader
  // In a chapter, graphicx goes into the main file first; SumiTeX opens it
  // and comes back, before anything is uploaded
  const before = view.state.doc.toString()
  if (chapterNeedsGraphicx(before)) {
    try {
      await requestAddPackage('graphicx')
    } catch (error) {
      debugConsole.error('SumiTeX: adding graphicx for an image', error)
    }
    if (!(await backInChapter(view, before))) return
  }

  const id = ++nextId
  view.dispatch({ effects: addPending.of({ id, pos, count: files.length }) })
  try {
    const images = await upload(files, pasted)
    if (!images.length) throw new Error('nothing was uploaded')
    insertFigures(view, id, images)
  } catch (error) {
    debugConsole.error('SumiTeX: adding an image', error)
    if (view.state.field(pendingField, false)?.some(item => item.id === id)) {
      view.dispatch({ effects: removePending.of(id) })
    }
    flashMessage(
      view,
      error instanceof Error && error.message.startsWith('SumiTeX:')
        ? error.message.slice('SumiTeX: '.length)
        : 'The image couldn’t be uploaded. Check your connection and try again.'
    )
  }
}

const handleFiles = (
  view: EditorView,
  list: FileList | null | undefined,
  pasted: boolean,
  pos: number
) => {
  if (view.state.readOnly || !uploader || !list) return false
  const files = [...list].filter(isImage)
  if (!files.length) return false
  void addImages(view, files, pasted, pos)
  return true
}

export const imagePaste = () => [
  pendingField,
  insertedField,
  // Ahead of the stock handler, which opens the "Insert figure" dialog
  Prec.high(
    EditorView.domEventHandlers({
      paste(event, view) {
        const data = event.clipboardData
        if (!data || data.files.length === 0) return false
        // Text that came with the image (Word, a web page) stays a text paste
        if (data.types.includes('text/plain')) return false
        const handled = handleFiles(
          view,
          data.files,
          true,
          view.state.selection.main.head
        )
        if (handled) event.preventDefault()
        return handled
      },
      drop(event, view) {
        const data = event.dataTransfer
        if (!data || data.files.length === 0) return false
        const pos =
          view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
          view.state.selection.main.head
        const handled = handleFiles(view, data.files, false, pos)
        if (handled) event.preventDefault()
        return handled
      },
    })
  ),
  EditorView.baseTheme({
    '.sx-image-uploading': {
      display: 'inline-block',
      margin: '0 4px',
      padding: '0 8px',
      borderRadius: '999px',
      fontSize: '12px',
      lineHeight: '20px',
      color: 'var(--sx-muted, #8a93a3)',
      background: 'var(--sx-island-raised, #eef0f4)',
      animation: 'sx-image-pulse 1.2s ease-in-out infinite',
    },
    '@keyframes sx-image-pulse': {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.55 },
    },
    '.cm-tooltip.cm-tooltip-above:has(.sx-image-size)': {
      border: 'none',
      background: 'transparent',
    },
    '.sx-image-size': {
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      padding: '3px',
      borderRadius: '8px',
      fontSize: '12px',
      color: 'var(--sx-fg, #1f2430)',
      background: 'var(--sx-island-raised, #fff)',
      border: '1px solid var(--sx-border, #d8dce3)',
      boxShadow: '0 4px 14px rgb(0 0 0 / 18%)',
    },
    '.sx-image-size-title': {
      padding: '0 6px 0 4px',
      color: 'var(--sx-muted, #6b7280)',
    },
    '.sx-image-size button': {
      minWidth: '30px',
      height: '24px',
      padding: '0 6px',
      border: '0',
      borderRadius: '5px',
      color: 'inherit',
      font: 'inherit',
      background: 'transparent',
      cursor: 'pointer',
    },
    '.sx-image-size button:hover': {
      background: 'var(--sx-border, #e5e7eb)',
    },
    '.sx-image-size button[aria-pressed="true"]': {
      color: 'var(--sx-selected-fg, #1f3f9e)',
      background: 'var(--sx-selected-bg, #e6edfd)',
      fontWeight: '600',
    },
  }),
]
