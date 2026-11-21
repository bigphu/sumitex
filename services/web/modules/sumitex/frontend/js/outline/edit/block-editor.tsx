/**
 * The Outline's edit pop-ups (mockup frames 14, 15, 16 and 18; Build
 * Guide 6c): a small editor over the text for a table, a list, an
 * equation or a section, opened from the Outline's ✎, the editor's
 * "✎ Edit" button, Ctrl+K E or the palette. Every change is
 * written straight into the LaTeX, so it shows in the editor at once,
 * one Ctrl+Z (in the pop-up too) takes it back, and collaborators see it
 * as any other edit. Esc or a click outside closes it.
 *
 * Mounted next to the editor by the bridge, which knows the editor view.
 * The pop-up keeps no copy of the block: it reads it again from the text
 * after every change (table-model.ts, list-model.ts).
 */
import {
  Dispatch,
  DragEvent,
  forwardRef,
  SetStateAction,
  InputHTMLAttributes,
  KeyboardEvent,
  TextareaHTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import classNames from 'classnames'
import type { EditorView } from '@codemirror/view'
import type { EditorState } from '@codemirror/state'
import { EditorView as View } from '@codemirror/view'
import { redo, undo } from '@codemirror/commands'
import MaterialIcon from '@/shared/components/material-icon'
import { subscribeEditorUpdates } from '../../editor/doc-updates'
import { flashMessage } from '../../editor/flash-message'
import { packageInsertion, requestAddPackage } from '../../editor/add-package'
import { preambleOf, stripComments } from '../../diagnostics/preamble'
import { getProjectPreamble } from '../../diagnostics/preamble-store'
import { onEditRequest } from './edit-requests'
import { onActionRequest, runAction } from './block-actions'
import { blockAt, type Open, type OpenKind } from './block-at'
import { loadMathJax } from '@/features/mathjax/load-mathjax'
import { previewTex } from '../math-text'
import SymbolPicker from '../../editor/symbols/symbol-picker'
import { STRUCTURES, symbolText } from '../../editor/symbols/symbol-data'
import { packageNeeded, hasOwnPreamble } from '../../editor/symbols/symbol-package'
import { isReferenced } from './parts'
import { useFileTreeData } from '@/shared/context/file-tree-data-context'
import { useFileTreePathContext } from '@/features/file-tree/contexts/file-tree-path'
import type { Folder } from '../../../../../../types/folder'
import { uploadImages } from '../../editor/image-paste'
import { parseFile } from '../../diagnostics/preamble'
import {
  PLACEMENTS,
  placementOf,
  readFigure,
  setCaption as setFigureCaption,
  setCentering,
  setImage,
  setLabel as setFigureLabel,
  setPlacement,
  setWidth,
  widthFraction,
  widthValue,
  type FigureModel,
} from './figure-model'
import {
  missingDefinition,
  readTheorem,
  setBody as setTheoremBody,
  setLabel as setTheoremLabel,
  setTitle as setTheoremTitle,
  setType as setTheoremType,
  THEOREM_TYPES,
  type TheoremModel,
} from './theorem-model'
import {
  readNote,
  removeTodo,
  setBoxTitle,
  setNoteText,
  type NoteModel,
} from './note-model'
import {
  LANGUAGES,
  readCode,
  setCaption as setCodeCaption,
  setCode,
  setLabel as setCodeLabel,
  setLanguage,
  setNumbered as setCodeNumbered,
  type CodeModel,
} from './code-model'
import {
  EQUATION_KINDS,
  readEquation,
  setKind,
  setLabel as setEquationLabel,
  setNumbered as setEquationNumbered,
  setSource,
  type EquationModel,
} from './equation-model'
import {
  LEVELS,
  readSection,
  setLabel as setSectionLabel,
  setLevel,
  setNumbered as setSectionNumbered,
  setTitle,
  type SectionModel,
} from './section-model'
import {
  addColumn,
  addRow,
  alignmentOf,
  cleanLabel,
  deleteColumn,
  deleteRow,
  moveColumn,
  moveRow,
  readTable,
  setAlignment,
  setCaption,
  setCell,
  setLabel,
  toBooktabs,
  type Edit,
  type TableModel,
} from './table-model'
import {
  addItem,
  deleteItem,
  LIST_TYPES,
  moveItem,
  readList,
  setItemText,
  setListType,
  type ListModel,
} from './list-model'

// Sizes: a list is this wide; a table grows with its columns up to the
// editor's width. A size set with the corner handle is kept, per kind: its
// width is the pop-up's width, its height only a cap, so a pop-up is never
// taller than what it holds (a short note stays short).
const LIST_WIDTH = 480
const MIN_WIDTH = 380
const MIN_HEIGHT = 120
const COLUMN_WIDTH = 120
const SYMBOLS_WIDTH = 400
const sizeKey = (kind: string) => `sumitex.edit-popup.size.${kind}`

type Size = { width: number; height: number }

function savedSize(kind: string): Size | null {
  try {
    const raw = localStorage.getItem(sizeKey(kind))
    return raw ? (JSON.parse(raw) as Size) : null
  } catch {
    return null
  }
}

function saveSize(kind: string, size: Size | null) {
  try {
    if (size) localStorage.setItem(sizeKey(kind), JSON.stringify(size))
    else localStorage.removeItem(sizeKey(kind))
  } catch {
    // storage blocked: the size lasts while the pop-up is open
  }
}
const ERROR_MS = 4000

const readers: Record<OpenKind, (state: EditorState, pos: number) => unknown> = {
  table: readTable,
  list: readList,
  equation: readEquation,
  section: readSection,
  figure: readFigure,
  theorem: readTheorem,
  note: readNote,
  code: readCode,
}

const WANTS: Record<OpenKind, number> = {
  table: LIST_WIDTH,
  list: LIST_WIDTH,
  equation: 560,
  section: 500,
  figure: 560,
  theorem: 540,
  note: 460,
  code: 620,
}

export default function BlockEditor({ view }: { view: EditorView }) {
  const [open, setOpen] = useState<Open | null>(null)
  // Each opening is a new pop-up (its focus, its size)
  const [opened, setOpened] = useState(0)
  // The equation pop-up's symbol column
  const [symbols, setSymbols] = useState(false)
  const [, setVersion] = useState(0)
  const anchor = useRef(0)

  // Requests from the Outline and the palette
  useEffect(
    () =>
      onEditRequest(({ pos, line, kind }) => {
        const at =
          line !== undefined
            ? view.state.doc.line(Math.min(line, view.state.doc.lines)).from
            : (pos ?? view.state.selection.main.head)
        const found = blockAt(view.state, at, kind)
        if (!found) {
          flashMessage(
            view,
            'Put the cursor in a table, list or equation, or on a section’s line, to edit it.'
          )
          return
        }
        anchor.current = found.anchor
        setOpen(found)
        setOpened(n => n + 1)
        setSymbols(false)
        view.dispatch({
          effects: View.scrollIntoView(found.anchor, { y: 'start', yMargin: 60 }),
        })
      }),
    [view]
  )

  // The Outline's ⋯ actions run here, where the editor is
  useEffect(() => onActionRequest(request => runAction(view, request)), [view])

  // Follow the text: keep the place through edits, and draw again
  useEffect(
    () =>
      subscribeEditorUpdates(update => {
        if (update.docChanged) {
          anchor.current = update.changes.mapPos(anchor.current, 1)
        }
        if (update.docChanged || update.geometryChanged || update.viewportChanged) {
          setVersion(v => v + 1)
        }
      }),
    []
  )

  const close = useCallback(() => {
    setOpen(null)
    view.focus()
  }, [view])

  if (!open) return null
  const state = view.state
  const model = readers[open.kind](state, anchor.current)
  // The block is gone (deleted, or another file is open)
  if (!model) {
    queueMicrotask(() => setOpen(null))
    return null
  }

  return createPortal(
    <Popup
      key={opened}
      view={view}
      close={close}
      anchor={anchor.current}
      kind={open.kind}
      wants={
        open.kind === 'table'
          ? 90 + (model as TableModel).columns * COLUMN_WIDTH
          : WANTS[open.kind] + (open.kind === 'equation' && symbols ? SYMBOLS_WIDTH : 0)
      }
    >
      {open.kind === 'table' && (
        <TableEditor view={view} model={model as TableModel} close={close} />
      )}
      {open.kind === 'list' && (
        <ListEditor view={view} model={model as ListModel} close={close} />
      )}
      {open.kind === 'equation' && (
        <EquationEditor
          view={view}
          model={model as EquationModel}
          close={close}
          picker={symbols}
          setPicker={setSymbols}
        />
      )}
      {open.kind === 'section' && (
        <SectionEditor view={view} model={model as SectionModel} close={close} />
      )}
      {open.kind === 'figure' && (
        <FigureEditor view={view} model={model as FigureModel} close={close} />
      )}
      {open.kind === 'theorem' && (
        <TheoremEditor view={view} model={model as TheoremModel} close={close} />
      )}
      {open.kind === 'note' && (
        <NoteEditor view={view} model={model as NoteModel} close={close} />
      )}
      {open.kind === 'code' && (
        <CodeEditor view={view} model={model as CodeModel} close={close} />
      )}
    </Popup>,
    document.body
  )
}

// ------------------------------------------------------------------ frame

function Popup({
  view,
  anchor,
  kind,
  wants,
  close,
  children,
}: {
  view: EditorView
  anchor: number
  kind: string
  /** The width the content would like */
  wants: number
  close: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size | null>(() => savedSize(kind))

  // Under the block's first line, over the editor; it follows scrolling.
  // Written straight to the element, so placing it never renders again.
  useLayoutEffect(() => {
    const position = () => {
      const popup = ref.current
      if (!popup) return
      const editor = view.scrollDOM.getBoundingClientRect()
      const coords = view.coordsAtPos(anchor)
      // As wide as the content wants: past the editor over the PDF if it
      // needs to, up to 90% of the window
      const room = Math.max(MIN_WIDTH, Math.min(window.innerWidth * 0.9, window.innerWidth - 24))
      const width = Math.round(
        Math.min(size?.width ?? Math.max(LIST_WIDTH, wants), window.innerWidth - 24)
      )
      popup.style.width = `${size ? width : Math.min(width, room)}px`
      popup.style.height = ''
      popup.style.maxHeight = size
        ? `${Math.min(size.height, window.innerHeight - 24)}px`
        : ''
      const height = popup.offsetHeight
      let top = coords ? coords.bottom + 6 : editor.top + 40
      top = Math.max(8, Math.min(top, window.innerHeight - height - 12))
      const left = Math.max(
        8,
        Math.min(editor.left + 24, window.innerWidth - popup.offsetWidth - 12)
      )
      popup.style.top = `${Math.round(top)}px`
      popup.style.left = `${Math.round(left)}px`
    }
    position()
    view.scrollDOM.addEventListener('scroll', position)
    window.addEventListener('resize', position)
    // Content that grows or shrinks (a row added, a section opened) moves the
    // pop-up back inside the window
    const content = new ResizeObserver(() => position())
    if (ref.current) content.observe(ref.current)
    return () => {
      content.disconnect()
      view.scrollDOM.removeEventListener('scroll', position)
      window.removeEventListener('resize', position)
    }
  })

  // The focus moves into the pop-up, to its first box, so typing and Esc
  // go to it (opening from the Outline moves the editor to the block,
  // which takes the focus first)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const first = ref.current?.querySelector<HTMLElement>(
        '.sx-edit-body input:not([type=file]), .sx-edit-body textarea, .sx-edit-body button'
      )
      first?.focus({ preventScroll: true })
    }, 80)
    return () => window.clearTimeout(timer)
    // Once per opening (the pop-up is new each time): an edit that moves
    // the block must not move the focus
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A click outside closes it (but not the Outline's ✎, which reopens it)
  useEffect(() => {
    const down = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target || ref.current?.contains(target)) return
      if (target.closest('.sx-outline-edit')) return
      close()
    }
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [close])

  // Esc closes even when the focus has left the pop-up (after a drag),
  // unless it is in the editor or another dialog
  useEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const active = document.activeElement
      if (ref.current?.contains(active)) return // handled below
      if (active?.closest('.cm-editor, .modal')) return
      close()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [close])

  // Esc closes; Ctrl+Z / Ctrl+Shift+Z undo and redo in the document
  const keyDown = (event: KeyboardEvent) => {
    const mod = event.ctrlKey || event.metaKey
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (mod && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo(view)
      else undo(view)
    } else if (mod && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      redo(view)
    }
  }

  return (
    <div
      ref={ref}
      className="sx-edit-popup"
      role="dialog"
      aria-modal="false"
      onKeyDown={keyDown}
    >
      {children}
      <div
        className="sx-edit-resize"
        title="Drag to resize; double-click for the automatic size"
        onPointerDown={event => {
          const popup = ref.current
          if (!popup) return
          event.preventDefault()
          const handle = event.currentTarget
          handle.setPointerCapture(event.pointerId)
          const start = { x: event.clientX, y: event.clientY }
          const from = { width: popup.offsetWidth, height: popup.offsetHeight }
          let next = from
          const move = (e: PointerEvent) => {
            next = {
              width: Math.max(MIN_WIDTH, from.width + e.clientX - start.x),
              height: Math.max(MIN_HEIGHT, from.height + e.clientY - start.y),
            }
            popup.style.width = `${next.width}px`
            // the height caps the pop-up; it never adds empty space below
            popup.style.maxHeight = `${next.height}px`
          }
          const up = () => {
            handle.removeEventListener('pointermove', move)
            handle.removeEventListener('pointerup', up)
            saveSize(kind, next)
            setSize(next)
          }
          handle.addEventListener('pointermove', move)
          handle.addEventListener('pointerup', up)
        }}
        onDoubleClick={() => {
          saveSize(kind, null)
          setSize(null)
        }}
      />
    </div>
  )
}

function Head({ title, close }: { title: string; close?: () => void }) {
  return (
    <div className="sx-edit-head">
      <span className="sx-edit-title">{title}</span>
      <span className="sx-edit-spacer" />
      {close && (
        <button
          type="button"
          className="sx-edit-icon"
          aria-label="Close"
          title="Close (Esc) · Ctrl+Z undoes a change"
          onClick={close}
        >
          <MaterialIcon type="close" />
        </button>
      )}
    </div>
  )
}

/** Apply an edit to the document, or show why not */
function useApply(view: EditorView) {
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(null), ERROR_MS)
    return () => window.clearTimeout(timer)
  }, [error])
  const apply = useCallback(
    (edit: Edit) => {
      if ('error' in edit) setError(edit.error as string)
      else if (edit.changes) view.dispatch(edit)
    },
    [view]
  )
  return { apply, error }
}

/**
 * Drag to reorder, with a live preview: while dragging, the dragged row,
 * column or item already sits where it would land (a faint silhouette)
 * and the others make room. Letting go writes the move; Esc or a drop
 * outside puts everything back.
 */
function useReorder(count: number, onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null)
  // The order to draw: original indices, the dragged one moved to `to`
  const order = Array.from({ length: count }, (_, i) => i)
  if (drag && drag.from < count) {
    order.splice(drag.from, 1)
    order.splice(Math.min(drag.to, count - 1), 0, drag.from)
  }
  return {
    order,
    dragging: drag?.from ?? null,
    grip: (
      index: number,
      enabled = true,
      image?: (grip: HTMLElement) => HTMLElement | null
    ) => ({
      draggable: enabled,
      onDragStart: (event: DragEvent) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', String(index))
        const picture = image?.(event.currentTarget as HTMLElement)
        if (picture) event.dataTransfer.setDragImage(picture, 12, 12)
        setDrag({ from: index, to: index })
      },
      onDragEnd: () => setDrag(null),
    }),
    /** A drawn row, column or item at this position takes the drag */
    target: (position: number) => ({
      onDragOver: (event: DragEvent) => {
        if (!drag) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        if (drag.to !== position) setDrag({ ...drag, to: position })
      },
    }),
    /** The table or list as a whole takes the drop */
    drop: (event: DragEvent) => {
      if (!drag) return false
      event.preventDefault()
      if (drag.to !== drag.from) onMove(drag.from, drag.to)
      setDrag(null)
      return true
    },
    allow: (event: DragEvent) => {
      if (drag) event.preventDefault()
    },
  }
}

/** A picture to follow the pointer: the row or item the grip is in */
const closestPicture = (selector: string) => (grip: HTMLElement) =>
  grip.closest<HTMLElement>(selector)

/**
 * A text box over a piece of the document. The pop-up reads the text back
 * after each keystroke without the spaces at its ends, so the box keeps
 * what was typed while it still matches (a space typed at the end stays
 * until the next letter), and follows the document when it changes.
 */
const Draft = forwardRef<
  HTMLInputElement & HTMLTextAreaElement,
  {
    value: string
    onValue: (value: string) => void
    multiline?: boolean
    /** A multiline box is as tall as its text, wrapped lines included, within these */
    minRows?: number
    maxRows?: number
  } & Omit<InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>
>(({ value, onValue, multiline, minRows = 2, maxRows = 8, ...rest }, ref) => {
  const [draft, setDraft] = useState(value)
  const shown = draft.trim() === value.trim() ? draft : value
  const change = (next: string) => {
    setDraft(next)
    onValue(next)
  }
  const box = useRef<HTMLTextAreaElement | null>(null)
  const setRef = (el: HTMLTextAreaElement | null) => {
    box.current = el
    if (typeof ref === 'function') ref(el as HTMLInputElement & HTMLTextAreaElement)
    else if (ref) ref.current = el as HTMLInputElement & HTMLTextAreaElement
  }
  // Fit the text: measure at the smallest size, then grow to what it needs
  useLayoutEffect(() => {
    const el = box.current
    if (!multiline || !el) return
    const style = getComputedStyle(el)
    const line = parseFloat(style.lineHeight) || 20
    const frame =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) +
      parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    el.style.height = 'auto'
    const wanted = el.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    const height = Math.min(Math.max(wanted, minRows * line + frame), maxRows * line + frame)
    el.style.height = `${Math.ceil(height)}px`
  }, [multiline, shown, minRows, maxRows])
  return multiline ? (
    <textarea {...rest} rows={minRows} ref={setRef} value={shown} onChange={event => change(event.target.value)} />
  ) : (
    <input {...rest} ref={ref} value={shown} onChange={event => change(event.target.value)} />
  )
})
Draft.displayName = 'Draft'

// ------------------------------------------------------------ quiet parts

/** A small dot that says, on hover, what is missing or unused */
function Problem({ text }: { text: string | null }) {
  return text ? <span className="sx-q-dot" title={text} aria-label={text} /> : null
}

/** One row: a small label on the left, the control on the right */
function Field({
  label,
  problem,
  top,
  children,
}: {
  label: string
  problem?: string | null
  /** The label above a tall control (text, code) */
  top?: boolean
  children: ReactNode
}) {
  return (
    <div className={classNames('sx-q-field', { 'sx-q-field-top': top })}>
      <span className="sx-q-label">
        {label}
        <Problem text={problem ?? null} />
      </span>
      <div className="sx-q-control">{children}</div>
    </div>
  )
}

/** The caption box; for figures and tables, a missing one is a problem */
function CaptionField({
  text,
  required,
  onValue,
}: {
  text: string | undefined
  required?: boolean
  onValue: (value: string) => void
}) {
  return (
    <Field label="Caption" problem={text || !required ? null : 'No caption yet'}>
      <Draft
        className="sx-edit-input"
        value={text ?? ''}
        placeholder="Add a caption"
        aria-label="Caption"
        onValue={onValue}
      />
    </Field>
  )
}

/** The label box; for figures and tables, a missing one is a problem */
function LabelField({
  label,
  referenced,
  required,
  placeholder,
  onValue,
}: {
  label: { text: string } | null
  referenced: boolean
  required?: boolean
  placeholder: string
  onValue: (value: string) => void
}) {
  const problem = !label?.text
    ? required
      ? 'No label, so the text can’t refer to it'
      : null
    : referenced
      ? null
      : 'The text never refers to it'
  return (
    <Field label="Label" problem={problem}>
      <input
        className="sx-edit-input"
        value={label?.text ?? ''}
        placeholder={placeholder}
        aria-label="Label"
        onChange={event => onValue(event.target.value)}
      />
    </Field>
  )
}

/** What fewer people change, folded away; open or shut is remembered */
function More({ kind, summary, children }: { kind: string; summary: string; children: ReactNode }) {
  const key = `sumitex.edit-popup.more.${kind}`
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(key) === 'true'
    } catch {
      return false
    }
  })
  const toggle = () =>
    setOpen(was => {
      try {
        localStorage.setItem(key, String(!was))
      } catch {
        // storage blocked: it stays open until the pop-up closes
      }
      return !was
    })
  return (
    <div className="sx-q-more">
      <button type="button" className="sx-q-more-toggle" aria-expanded={open} onClick={toggle}>
        <MaterialIcon type={open ? 'expand_more' : 'chevron_right'} />
        More
        {!open && <span className="sx-q-more-summary">{summary}</span>}
      </button>
      {open && <div className="sx-q-more-body">{children}</div>}
    </div>
  )
}

/** Segmented choices */
function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; title?: string }[]
  value: string
  onChange: (value: T) => void
}) {
  return (
    <div className="sx-edit-tabs" role="tablist">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="tab"
          title={option.title}
          aria-selected={value === option.value}
          className={classNames('sx-edit-tab', { 'sx-edit-tab-on': value === option.value })}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ table

const ALIGN_NEXT = { l: 'c', c: 'r', r: 'l' } as const
const ALIGN_NAME = { l: 'left', c: 'centre', r: 'right' } as const
const ALIGN_ICON = {
  l: 'format_align_left',
  c: 'format_align_center',
  r: 'format_align_right',
} as const

function TableEditor({
  view,
  model,
  close,
}: {
  view: EditorView
  model: TableModel
  close: () => void
}) {
  const { apply, error } = useApply(view)
  const state = view.state
  const count = model.columns
  const rows = useReorder(model.rows.length, (from, to) =>
    apply(moveRow(view.state, model, from, to))
  )
  const columns = useReorder(count, (from, to) =>
    apply(moveColumn(view.state, model, from, to))
  )

  // A column has no element of its own: draw one to follow the pointer
  const columnPicture = (column: number) => () => {
    const picture = document.createElement('div')
    picture.className = 'sx-edit-dragimage'
    for (const row of model.rows.slice(0, 8)) {
      const cell = document.createElement('div')
      cell.textContent = row.cells[column] ?? ''
      picture.append(cell)
    }
    document.body.append(picture)
    window.setTimeout(() => picture.remove())
    return picture
  }

  const booktabs = () => {
    const edit = toBooktabs(model)
    if ('error' in edit) return apply(edit)
    const text = view.state.doc.toString()
    const own = /\\documentclass/.test(stripComments(preambleOf(text)))
    const extra = own ? packageInsertion(text, 'booktabs') : null
    const changes = [...(edit.changes as object[]), ...(extra ? [extra] : [])]
    view.dispatch({ ...edit, changes: changes as never })
    if (!own && !getProjectPreamble().preamble?.loaded.has('booktabs')) {
      close()
      void requestAddPackage('booktabs')
    }
  }

  return (
    <>
      <Head title="Table" close={close} />
      <div className="sx-edit-body">
        <table
          className="sx-edit-grid"
          onDragOver={event => {
            rows.allow(event)
            columns.allow(event)
          }}
          onDrop={event => {
            if (!rows.drop(event)) columns.drop(event)
          }}
        >
          <thead>
            <tr>
              <th aria-hidden="true" />
              {columns.order.map((c, position) => {
                const align = alignmentOf(model, c) as 'l' | 'c' | 'r' | null
                return (
                  <th
                    key={c}
                    className={classNames({ 'sx-edit-ghost': columns.dragging === c })}
                    {...columns.target(position)}
                  >
                    <div className="sx-edit-colhead">
                      <span
                        className="sx-edit-grip"
                        title="Drag to move this column"
                        {...columns.grip(c, true, columnPicture(c))}
                      >
                        ⠿
                      </span>
                      {align ? (
                        <button
                          type="button"
                          className="sx-edit-icon"
                          title={`Aligned ${ALIGN_NAME[align]}; click to change`}
                          onClick={() => apply(setAlignment(model, c, ALIGN_NEXT[align]))}
                        >
                          <MaterialIcon type={ALIGN_ICON[align]} />
                        </button>
                      ) : (
                        <code className="sx-edit-spec">
                          {model.tokens.filter(t => t.column)[c]?.text}
                        </code>
                      )}
                      <button
                        type="button"
                        className="sx-edit-icon sx-edit-remove"
                        title="Delete this column"
                        onClick={() => apply(deleteColumn(model, c))}
                      >
                        <MaterialIcon type="close" />
                      </button>
                    </div>
                  </th>
                )
              })}
              <th>
                <button
                  type="button"
                  className="sx-edit-icon"
                  title="Add a column"
                  onClick={() => apply(addColumn(view.state, model))}
                >
                  <MaterialIcon type="add" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.order.map((r, position) => {
              const row = model.rows[r]
              return (
              <tr
                key={r}
                className={classNames({ 'sx-edit-ghost': rows.dragging === r })}
                {...rows.target(position)}
              >
                <td className="sx-edit-rowgrip">
                  <span
                    className={classNames('sx-edit-grip', { 'sx-edit-grip-off': !row.single })}
                    title={row.single ? 'Drag to move this row' : 'This row shares its line; move it in the editor'}
                    {...rows.grip(r, row.single, closestPicture('tr'))}
                  >
                    ⠿
                  </span>
                </td>
                {columns.order.map(c =>
                  c < row.cells.length ? (
                    <td
                      key={c}
                      className={classNames({ 'sx-edit-ghost-cell': columns.dragging === c })}
                    >
                      <Draft
                        className="sx-edit-input"
                        value={row.cells[c]}
                        aria-label={`Row ${r + 1}, column ${c + 1}`}
                        onValue={value => apply(setCell(model, r, c, value))}
                      />
                    </td>
                  ) : (
                    <td key={c} className="sx-edit-missing" />
                  )
                )}
                <td>
                  <button
                    type="button"
                    className="sx-edit-icon sx-edit-remove"
                    title="Delete this row"
                    onClick={() => apply(deleteRow(state, model, r))}
                  >
                    <MaterialIcon type="close" />
                  </button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        <div className="sx-edit-actions">
          <button type="button" className="sx-edit-link" onClick={() => apply(addRow(view.state, model))}>
            + Row
          </button>
        </div>
        <CaptionField required text={model.caption?.text} onValue={value => apply(setCaption(view.state, model, value))} />
        <LabelField
          label={model.label}
          referenced={isReferenced(view.state, model.label?.text)}
          required
          placeholder="tab:"
          onValue={value => apply(setLabel(view.state, model, cleanLabel(value)))}
        />
        {model.hlines.length > 0 && (
          <More kind="table" summary="cleaner rules">
            <button
              type="button"
              className="sx-edit-chip"
              title="\hline rules become \toprule, \midrule and \bottomrule, without vertical rules (adds booktabs)"
              onClick={booktabs}
            >
              Cleaner rules (booktabs)
            </button>
          </More>
        )}
        {error && (
          <p className="sx-edit-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  )
}

// ------------------------------------------------------------------- list

const TYPE_NAMES: Record<string, string> = {
  itemize: 'Bullets',
  enumerate: 'Numbered',
  description: 'Description',
}

function ListEditor({
  view,
  model,
  close,
}: {
  view: EditorView
  model: ListModel
  close: () => void
}) {
  const { apply, error } = useApply(view)
  const items = useReorder(model.items.length, (from, to) =>
    apply(moveItem(view.state, model, from, to))
  )
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const focusLast = useRef(false)

  // After "+ Item", the new item's box takes the focus
  useEffect(() => {
    if (focusLast.current) {
      focusLast.current = false
      inputs.current[model.items.length - 1]?.focus()
    }
  })

  const add = () => {
    focusLast.current = true
    apply(addItem(view.state, model))
  }

  return (
    <>
      <Head title="List" close={close} />
      <div className="sx-edit-body">
        <div className="sx-edit-tabs" role="tablist">
          {LIST_TYPES.map(type => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={model.type === type}
              title={`\\begin{${type}}`}
              className={classNames('sx-edit-tab', { 'sx-edit-tab-on': model.type === type })}
              onClick={() => apply(setListType(model, type))}
            >
              {TYPE_NAMES[type]}
            </button>
          ))}
        </div>
        <ol className="sx-edit-items" onDragOver={items.allow} onDrop={items.drop}>
          {items.order.map((i, position) => {
            const item = model.items[i]
            return (
            <li
              key={i}
              className={classNames('sx-edit-item', { 'sx-edit-ghost': items.dragging === i })}
              {...items.target(position)}
            >
              <span
                className="sx-edit-grip"
                title="Drag to move this item"
                {...items.grip(i, true, closestPicture('li'))}
              >
                ⠿
              </span>
              {/* Numbers follow the drawn order, so they renumber live */}
              <span className="sx-edit-marker">
                {model.type === 'enumerate' ? `${position + 1}.` : '•'}
              </span>
              {item.editable ? (
                <Draft
                  ref={element => {
                    inputs.current[i] = element
                  }}
                  className="sx-edit-input sx-edit-item-input"
                  value={item.text}
                  aria-label={`Item ${i + 1}`}
                  onValue={value => apply(setItemText(model, i, value))}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      if (i === model.items.length - 1) add()
                      else inputs.current[i + 1]?.focus()
                    }
                  }}
                />
              ) : (
                <span className="sx-edit-readonly" title="This item runs over several lines; edit it in the editor">
                  {item.text || '…'}
                </span>
              )}
              <button
                type="button"
                className="sx-edit-icon sx-edit-remove"
                title="Delete this item"
                onClick={() => apply(deleteItem(model, i))}
              >
                <MaterialIcon type="close" />
              </button>
            </li>
            )
          })}
        </ol>
        <div className="sx-edit-actions">
          <button type="button" className="sx-edit-link" onClick={add}>
            + Item
          </button>
        </div>
        {error && (
          <p className="sx-edit-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  )
}

// --------------------------------------------------------------- switches

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <label className="sx-edit-switch">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={classNames('sx-edit-switch-track', { 'sx-edit-switch-on': checked })}
        onClick={() => onChange(!checked)}
      >
        <span className="sx-edit-switch-knob" />
      </button>
    </label>
  )
}


// --------------------------------------------------------------- equation

function MathPreview({ tex }: { tex: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let live = true
    // Draw once typing pauses
    const timer = window.setTimeout(() => {
      loadMathJax()
        .then(async MathJax => {
          const node = await MathJax.tex2svgPromise(tex, { display: true })
          if (live && ref.current) ref.current.replaceChildren(node)
        })
        .catch(() => {
          if (live && ref.current) ref.current.textContent = tex
        })
    }, 250)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [tex])
  return <div className="sx-edit-preview" ref={ref} aria-label="Preview" />
}

const EQUATION_TABS = ['equation', 'align'] as const

function EquationEditor({
  view,
  model,
  close,
  picker,
  setPicker,
}: {
  view: EditorView
  model: EquationModel
  close: () => void
  /** All symbols showing on the right (the pop-up widens for them) */
  picker: boolean
  setPicker: Dispatch<SetStateAction<boolean>>
}) {
  const { apply, error } = useApply(view)
  const source = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  // Where the cursor goes in the source after an insert
  const caret = useRef<number | null>(null)
  // Packages the main file needs, loaded when the pop-up closes (going
  // there now would close it)
  const later = useRef(new Set<string>())

  useLayoutEffect(() => {
    const box = source.current
    if (caret.current === null || !box) return
    if (!picker) box.focus()
    box.setSelectionRange(caret.current, caret.current)
    caret.current = null
  })

  useEffect(
    () => () => {
      const [first, ...rest] = [...later.current]
      if (first) void requestAddPackage(first, { alsoAdd: rest })
    },
    []
  )

  /** Put `tex` in at the source's cursor; | marks where the cursor goes */
  const insert = (tex: string, pkg?: string) => {
    const box = source.current
    // What the box shows (it may end in a space the document lost)
    const text = box?.value ?? model.source.text
    const start = box ? box.selectionStart : text.length
    const end = box ? box.selectionEnd : text.length
    let piece: string
    let at: number
    if (tex.includes('|')) {
      // A structure: what was selected goes in its first box
      const selected = text.slice(start, end)
      piece = tex.replace('|', selected)
      at = start + tex.indexOf('|') + selected.length
    } else {
      piece = symbolText(tex, text.slice(end, end + 1))
      at = start + piece.length - (piece.endsWith('{}') ? 1 : 0)
    }
    caret.current = at
    apply(setSource(model, text.slice(0, start) + piece + text.slice(end)))
    if (pkg) {
      const needed = packageNeeded(view.state.doc.toString(), pkg)
      if (needed === 'main') later.current.add(pkg)
      else if (needed) view.dispatch({ changes: needed, userEvent: 'input.sumitex-symbol' })
    }
  }

  const tabs: string[] = [...EQUATION_TABS]
  if (!tabs.includes(model.kind)) tabs.push(model.kind)
  // Drawn as LaTeX lays this kind out, so it matches the PDF
  const tex = previewTex(model.kind, model.source.text)

  return (
    <>
      <Head title="Equation" close={close} />
      <div className={classNames('sx-edit-body', { 'sx-edit-split': picker })}>
        <div className="sx-edit-main">
          <MathPreview tex={tex} />
          <div className="sx-edit-toolbar" role="toolbar" aria-label="Insert">
            {STRUCTURES.map(item => (
              <button
                key={item.tex}
                type="button"
                className="sx-edit-tool"
                title={item.title}
                onMouseDown={event => event.preventDefault()}
                onClick={() => insert(item.tex)}
              >
                {item.label}
              </button>
            ))}
            <span className="sx-edit-spacer" />
            <button
              type="button"
              className={classNames('sx-edit-tool sx-edit-tool-more', { 'sx-edit-tool-on': picker })}
              aria-expanded={picker}
              title="Symbols (Ctrl+K M in the editor)"
              onMouseDown={event => event.preventDefault()}
              onClick={() => setPicker(on => !on)}
            >
              Ω
            </button>
          </div>
          <Draft
            multiline
            ref={source}
            className="sx-edit-input sx-edit-source"
            value={model.source.text}
            aria-label="Source"
            minRows={2}
            maxRows={8}
            spellCheck={false}
            onValue={value => apply(setSource(model, value))}
          />
          <LabelField
            label={model.label}
            referenced={model.referenced}
            placeholder="eq:"
            onValue={value => apply(setEquationLabel(model, value))}
          />
          <More kind="equation" summary={`${model.kind} · ${model.numbered ? 'numbered' : 'unnumbered'}`}>
            <div className="sx-edit-row">
              <Choice
                options={tabs.map(kind => ({
                  value: kind,
                  label: kind,
                  title: kind === 'align' ? 'Several lines, lined up at &' : `\\begin{${kind}}`,
                }))}
                value={model.bracket ? '' : model.kind}
                onChange={kind =>
                  (EQUATION_KINDS as readonly string[]).includes(kind) &&
                  apply(setKind(model, kind as (typeof EQUATION_KINDS)[number]))
                }
              />
              <span className="sx-edit-spacer" />
              <Switch
                label="Numbered"
                checked={model.numbered}
                onChange={on => apply(setEquationNumbered(model, on))}
              />
            </div>
          </More>
          {error && (
            <p className="sx-edit-error" role="alert">
              {error}
            </p>
          )}
        </div>
        {picker && (
          <aside className="sx-edit-side" aria-label="Symbols">
            <SymbolPicker
              onPick={symbol => insert(symbol.tex, symbol.package)}
              onClose={() => {
                setPicker(false)
                source.current?.focus()
              }}
            />
          </aside>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------- section

const LEVEL_NAMES: Record<string, string> = {
  part: 'part',
  chapter: 'chapter',
  section: 'section',
  subsection: 'subsection',
  subsubsection: 'subsubsection',
  paragraph: 'paragraph',
  subparagraph: 'subparagraph',
}

/** Whether this document has chapters to offer (book, report…) */
function hasChapters(text: string) {
  return (
    /\\chapter\*?\s*[[{]/.test(text) ||
    /\\documentclass\s*(\[[^\]]*\])?\s*\{(book|report|memoir|scrbook|scrreprt)\}/.test(text)
  )
}

function SectionEditor({
  view,
  model,
  close,
}: {
  view: EditorView
  model: SectionModel
  close: () => void
}) {
  const { apply, error } = useApply(view)
  const levels: number[] = [2, 3, 4]
  if (hasChapters(view.state.doc.toString())) levels.unshift(1)
  if (!levels.includes(model.level)) levels.push(model.level)
  levels.sort((a, b) => a - b)

  const command = `\\${LEVELS[model.level]}`

  return (
    <>
      <Head title={LEVEL_NAMES[LEVELS[model.level]].replace(/^./, c => c.toUpperCase())} close={close} />
      <div className="sx-edit-body">
        <Field label="Title">
          <Draft
            className="sx-edit-input"
            value={model.title.text}
            aria-label="Title"
            onValue={value => apply(setTitle(model, value))}
          />
        </Field>
        <Field label="Level">
          <Choice
            options={levels.map(level => ({
              value: String(level),
              label: LEVELS[level],
              title: model.inner.length ? 'The sections inside move with it' : undefined,
            }))}
            value={String(model.level)}
            onChange={level => apply(setLevel(model, Number(level)))}
          />
        </Field>
        <LabelField
          label={model.label}
          referenced={model.referenced}
          placeholder="sec:"
          onValue={value => apply(setSectionLabel(model, value))}
        />
        <More kind="section" summary={model.numbered ? 'numbered' : 'unnumbered'}>
          <Switch
            label={`Numbered (${command}* has no number)`}
            checked={model.numbered}
            onChange={on => apply(setSectionNumbered(model, on))}
          />
        </More>
        {error && (
          <p className="sx-edit-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  )
}

// ----------------------------------------------------------------- figure

const IMAGE_FILE = /\.(png|jpe?g|pdf|eps|svg|gif|webp)$/i

/** Every image in the project, by path */
function projectImages(root: Folder | undefined) {
  const found: string[] = []
  const walk = (folder: Folder, prefix: string) => {
    for (const file of folder.fileRefs) {
      if (IMAGE_FILE.test(file.name)) found.push(prefix + file.name)
    }
    for (const sub of folder.folders) walk(sub, `${prefix}${sub.name}/`)
  }
  if (root) walk(root, '')
  return found.sort()
}

/** A path as written (maybe without its extension) to a file of the project */
function resolveImage(path: string, images: string[]) {
  if (images.includes(path)) return path
  return images.find(image => image.replace(/\.[^./]+$/, '') === path) ?? null
}

function Thumbnail({ path, images }: { path: string; images: string[] }) {
  const { previewByPath } = useFileTreePathContext()
  const file = resolveImage(path, images)
  const preview = file ? previewByPath(file) : null
  if (!preview) {
    return <div className="sx-edit-thumb sx-edit-thumb-missing">{file ? 'No preview' : 'Not in the project'}</div>
  }
  if (!/^(png|jpe?g|gif|svg|webp)$/i.test(preview.extension)) {
    return <div className="sx-edit-thumb sx-edit-thumb-missing">{preview.extension.toUpperCase()}</div>
  }
  return <img className="sx-edit-thumb" src={preview.url} alt="" />
}

const WIDTHS: { value: string; label: string }[] = [
  { value: '0.25', label: '¼' },
  { value: '0.5', label: '½' },
  { value: '0.75', label: '¾' },
  { value: '1', label: 'Full' },
]

function FigureEditor({
  view,
  model,
  close,
}: {
  view: EditorView
  model: FigureModel
  close: () => void
}) {
  const { apply, error } = useApply(view)
  const { fileTreeData } = useFileTreeData()
  const images = projectImages(fileTreeData as Folder | undefined)
  const [choosing, setChoosing] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const placement = placementOf(view.state, model)

  const upload = async (index: number, files: File[], pasted: boolean) => {
    if (!files.length) return
    setBusy(true)
    setUploadError(null)
    try {
      const [first] = await uploadImages(files.slice(0, 1), pasted)
      const fresh = readFigure(view.state, model.range.from)
      if (first && fresh) apply(setImage(fresh, index, first.path))
      setChoosing(null)
    } catch (e) {
      setUploadError(
        e instanceof Error && e.message.startsWith('SumiTeX: ')
          ? e.message.slice('SumiTeX: '.length)
          : 'The image couldn’t be uploaded.'
      )
    } finally {
      setBusy(false)
    }
  }

  const placementName =
    PLACEMENTS.find(p => p.value === placement)?.label.toLowerCase() ?? (placement ? `[${placement}]` : 'default place')

  return (
    <>
      <Head title={model.name ? 'Figure' : 'Drawing'} close={close} />
      <div className="sx-edit-body">
        {model.images.map((image, i) => {
          const fraction = widthFraction(image.width)
          return (
            <div
              key={i}
              className="sx-edit-image"
              onPaste={event => {
                const files = [...event.clipboardData.files].filter(f => f.type.startsWith('image/'))
                if (files.length) {
                  event.preventDefault()
                  void upload(i, files, true)
                }
              }}
            >
              <Thumbnail path={image.path.text} images={images} />
              <div className="sx-edit-image-side">
                <div className="sx-edit-row">
                  <code className="sx-edit-path" title={image.path.text}>
                    {image.path.text}
                  </code>
                  <span className="sx-edit-spacer" />
                  <button
                    type="button"
                    className="sx-edit-link"
                    onClick={() => setChoosing(choosing === i ? null : i)}
                  >
                    Replace
                  </button>
                </div>
                <Choice
                  options={WIDTHS}
                  value={fraction ?? ''}
                  onChange={value => apply(setWidth(view.state, model, i, widthValue(value)))}
                />
                {choosing === i && (
                  <div className="sx-edit-choose">
                    <select
                      className="sx-edit-input"
                      aria-label="An image from the project"
                      value=""
                      onChange={event => {
                        if (!event.target.value) return
                        apply(setImage(model, i, event.target.value))
                        setChoosing(null)
                      }}
                    >
                      <option value="">An image from the project…</option>
                      {images.map(path => (
                        <option key={path} value={path}>
                          {path}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="sx-edit-link"
                      disabled={busy}
                      title="Or paste an image here"
                      onClick={() => fileInput.current?.click()}
                    >
                      {busy ? 'Uploading…' : 'Upload'}
                    </button>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/*,.pdf,.eps"
                      hidden
                      onChange={event => {
                        void upload(i, [...(event.target.files ?? [])], false)
                        event.target.value = ''
                      }}
                    />
                    {uploadError && <p className="sx-edit-error">{uploadError}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <CaptionField required text={model.caption?.text} onValue={value => apply(setFigureCaption(view.state, model, value))} />
        <LabelField
          label={model.label}
          referenced={model.referenced}
          required
          placeholder="fig:"
          onValue={value => apply(setFigureLabel(view.state, model, value))}
        />
        {(model.images.length > 0 || (model.name && model.name !== 'wrapfigure')) && (
          <More
            kind="figure"
            summary={[
              model.name && model.name !== 'wrapfigure' ? placementName : null,
              model.name ? (model.centering ? 'centred' : 'not centred') : null,
              model.images.length ? 'exact width' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          >
            {model.name && model.name !== 'wrapfigure' && (
              <Field label="Place">
                <Choice options={PLACEMENTS} value={placement} onChange={value => apply(setPlacement(model, value))} />
              </Field>
            )}
            {model.name && (
              <Field label="">
                <Switch
                  label="Centred"
                  checked={Boolean(model.centering)}
                  onChange={on => apply(setCentering(view.state, model, on))}
                />
              </Field>
            )}
            {model.images.map((image, i) => (
              <Field key={i} label={model.images.length > 1 ? `Width ${i + 1}` : 'Width'}>
                <Draft
                  className="sx-edit-input sx-edit-width"
                  value={image.width ?? ''}
                  placeholder="natural size, or 5cm…"
                  aria-label="Width as written"
                  onValue={value => apply(setWidth(view.state, model, i, value.trim()))}
                />
              </Field>
            ))}
          </More>
        )}
        {error && (
          <p className="sx-edit-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------- theorem

/** What the preamble in effect defines, or null when it can't be read */
function definedNames(text: string) {
  if (hasOwnPreamble(text)) return parseFile(preambleOf(text)).defined
  return getProjectPreamble().preamble?.defined ?? null
}

function TheoremEditor({
  view,
  model,
  close,
}: {
  view: EditorView
  model: TheoremModel
  close: () => void
}) {
  const { apply, error } = useApply(view)
  const types = THEOREM_TYPES.map(t => ({ name: t.name, title: t.title }))
  if (!types.some(t => t.name === model.type)) types.push({ name: model.type, title: model.type })
  const missing = missingDefinition(model.type, definedNames(view.state.doc.toString()))
  const title = THEOREM_TYPES.find(t => t.name === model.type)?.title ?? model.type

  return (
    <>
      <Head title={title} close={close} />
      <div className="sx-edit-body">
        <Field label="Type" problem={missing ? `${title} isn’t defined in the preamble yet, so it won’t compile` : null}>
          <div className="sx-edit-row">
            <select
              className="sx-edit-input sx-q-select"
              aria-label="Type"
              value={model.type}
              onChange={event => apply(setTheoremType(model, event.target.value))}
            >
              {types.map(t => (
                <option key={t.name} value={t.name}>
                  {t.title}
                </option>
              ))}
            </select>
            {missing && (
              <button
                type="button"
                className="sx-edit-link"
                title={`Adds ${missing} to the preamble`}
                onClick={() => void requestAddPackage('amsthm', { preambleLines: [missing] })}
              >
                Define it
              </button>
            )}
          </div>
        </Field>
        <Field label="Name">
          <Draft
            className="sx-edit-input"
            value={model.title?.text ?? ''}
            placeholder="optional, e.g. Pythagoras"
            aria-label="Name"
            onValue={value => apply(setTheoremTitle(model, value))}
          />
        </Field>
        <Field label="Text" top>
          <Draft
            multiline
            className="sx-edit-input sx-edit-body-text"
            value={model.body.text}
            aria-label="Text"
            minRows={2}
            maxRows={8}
            onValue={value => apply(setTheoremBody(model, value))}
          />
        </Field>
        {model.type !== 'proof' && (
          <LabelField
            label={model.label}
            referenced={model.referenced}
            placeholder={`${model.type.slice(0, 3)}:`}
            onValue={value => apply(setTheoremLabel(model, value))}
          />
        )}
        {error && (
          <p className="sx-edit-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  )
}

// ------------------------------------------------------------------- note

function NoteEditor({
  view,
  model,
  close,
}: {
  view: EditorView
  model: NoteModel
  close: () => void
}) {
  const { apply, error } = useApply(view)
  const text = model.kind === 'todo' ? model.text.text : model.body.text
  return (
    <>
      <Head title={model.kind === 'todo' ? 'To-do' : 'Box'} close={close} />
      <div className="sx-edit-body">
        {model.kind === 'box' && (
          <Field label="Title">
            <Draft
              className="sx-edit-input"
              value={model.title}
              placeholder="no title"
              aria-label="Title"
              onValue={value => apply(setBoxTitle(view.state, model, value))}
            />
          </Field>
        )}
        <Draft
          multiline
          className="sx-edit-input sx-edit-body-text"
          value={text}
          aria-label={model.kind === 'todo' ? 'To do' : 'Text'}
          minRows={2}
          maxRows={8}
          onValue={value => apply(setNoteText(model, value))}
        />
        {model.kind === 'todo' && (
          <div className="sx-edit-actions">
            <span className="sx-edit-spacer" />
            <button
              type="button"
              className="sx-edit-chip"
              title="Remove this \todo from the text"
              onClick={() => {
                apply(removeTodo(view.state, model))
                close()
              }}
            >
              ✓ Done
            </button>
          </div>
        )}
        {error && (
          <p className="sx-edit-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  )
}

// ------------------------------------------------------------------- code

function CodeEditor({
  view,
  model,
  close,
}: {
  view: EditorView
  model: CodeModel
  close: () => void
}) {
  const { apply, error } = useApply(view)
  const isAlgorithm = model.name.startsWith('algorithm')
  return (
    <>
      <Head title={isAlgorithm ? 'Algorithm' : 'Code'} close={close} />
      <div className="sx-edit-body">
        {!isAlgorithm && (
          <Field label="Language">
            <Draft
              className="sx-edit-input"
              value={model.language}
              list="sx-edit-languages"
              placeholder={model.name === 'minted' ? 'python' : 'Python'}
              aria-label="Language"
              onValue={value => apply(setLanguage(view.state, model, value.trim()))}
            />
            <datalist id="sx-edit-languages">
              {LANGUAGES.map(language => (
                <option key={language} value={model.name === 'minted' ? language.toLowerCase() : language} />
              ))}
            </datalist>
          </Field>
        )}
        {model.code && (
          <Draft
            multiline
            className="sx-edit-input sx-edit-source"
            value={model.code.text}
            aria-label="Code"
            minRows={3}
            maxRows={14}
            spellCheck={false}
            onValue={value => apply(setCode(model, value))}
          />
        )}
        {model.captionIn && (
          <>
            <CaptionField text={model.caption?.text} onValue={value => apply(setCodeCaption(view.state, model, value))} />
            <LabelField
              label={model.label}
              referenced={model.referenced}
              placeholder={isAlgorithm ? 'alg:' : 'lst:'}
              onValue={value => apply(setCodeLabel(view.state, model, value))}
            />
          </>
        )}
        {!isAlgorithm && (
          <More kind="code" summary={model.numbered ? 'line numbers' : 'no line numbers'}>
            <Switch
              label="Line numbers"
              checked={model.numbered}
              onChange={on => apply(setCodeNumbered(view.state, model, on))}
            />
          </More>
        )}
        {error && (
          <p className="sx-edit-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  )
}
