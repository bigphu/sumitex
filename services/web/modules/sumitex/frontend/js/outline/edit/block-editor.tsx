/**
 * The Outline's edit pop-ups (mockup frames 14 and 15; Build Guide 6c):
 * a small editor over the text for a table or a list, opened from the
 * Outline's ✎ or the palette's "Edit table or list". Every change is
 * written straight into the LaTeX, so it shows in the editor at once,
 * one Ctrl+Z (in the pop-up too) takes it back, and collaborators see it
 * as any other edit. Esc or a click outside closes it.
 *
 * Mounted next to the editor by the bridge, which knows the editor view.
 * The pop-up keeps no copy of the block: it reads it again from the text
 * after every change (table-model.ts, list-model.ts).
 */
import {
  DragEvent,
  KeyboardEvent,
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
import { EditorView as View } from '@codemirror/view'
import { redo, undo } from '@codemirror/commands'
import MaterialIcon from '@/shared/components/material-icon'
import { subscribeEditorUpdates } from '../../editor/doc-updates'
import { flashMessage } from '../../editor/flash-message'
import { packageInsertion, requestAddPackage } from '../../editor/add-package'
import { preambleOf, stripComments } from '../../diagnostics/preamble'
import { getProjectPreamble } from '../../diagnostics/preamble-store'
import { onEditRequest, type EditKind } from './edit-requests'
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
// editor's width. A size set with the corner handle is kept, per kind.
const LIST_WIDTH = 480
const MIN_WIDTH = 380
const MIN_HEIGHT = 200
const COLUMN_WIDTH = 120
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

type Open = { anchor: number; kind: 'table' | 'list' }

/** Which block is at `pos`: the innermost table or list */
function blockAt(view: EditorView, pos: number, kind: EditKind): Open | null {
  const table = kind !== 'list' ? readTable(view.state, pos) : null
  const list = kind !== 'table' ? readList(view.state, pos) : null
  if (table && list) {
    return list.list.from > table.tabular.from
      ? { anchor: list.list.from, kind: 'list' }
      : { anchor: table.tabular.from, kind: 'table' }
  }
  if (table) return { anchor: table.tabular.from, kind: 'table' }
  if (list) return { anchor: list.list.from, kind: 'list' }
  return null
}

export default function BlockEditor({ view }: { view: EditorView }) {
  const [open, setOpen] = useState<Open | null>(null)
  const [, setVersion] = useState(0)
  const anchor = useRef(0)

  // Requests from the Outline and the palette
  useEffect(
    () =>
      onEditRequest(({ pos, kind }) => {
        const found = blockAt(view, pos, kind)
        if (!found) {
          flashMessage(view, 'Put the cursor in a table or a list to edit it.')
          return
        }
        anchor.current = found.anchor
        setOpen(found)
        view.dispatch({
          effects: View.scrollIntoView(found.anchor, { y: 'start', yMargin: 60 }),
        })
      }),
    [view]
  )

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
  const model =
    open.kind === 'table'
      ? readTable(state, anchor.current)
      : readList(state, anchor.current)
  // The block is gone (deleted, or another file is open)
  if (!model) {
    queueMicrotask(() => setOpen(null))
    return null
  }

  return createPortal(
    <Popup
      view={view}
      close={close}
      anchor={anchor.current}
      kind={open.kind}
      wants={
        open.kind === 'table'
          ? 90 + (model as TableModel).columns * COLUMN_WIDTH
          : LIST_WIDTH
      }
    >
      {open.kind === 'table' ? (
        <TableEditor view={view} model={model as TableModel} close={close} />
      ) : (
        <ListEditor view={view} model={model as ListModel} close={close} />
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
      popup.style.height = size ? `${Math.min(size.height, window.innerHeight - 24)}px` : ''
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
    return () => {
      view.scrollDOM.removeEventListener('scroll', position)
      window.removeEventListener('resize', position)
    }
  })

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
      <div className="sx-edit-foot">
        Changes rewrite the LaTeX in place · Ctrl+Z undoes · Esc closes
      </div>
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
            popup.style.height = `${next.height}px`
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

function Head({ title, note, close }: { title: string; note?: string; close?: () => void }) {
  return (
    <div className="sx-edit-head">
      <span className="sx-edit-title">{title}</span>
      {note && <code className="sx-edit-note">{note}</code>}
      <span className="sx-edit-spacer" />
      {close && (
        <button type="button" className="sx-edit-icon" aria-label="Close" onClick={close}>
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
      <Head title="Edit table" note={model.label?.text || 'no label yet'} close={close} />
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
                      <input
                        className="sx-edit-input"
                        value={row.cells[c]}
                        aria-label={`Row ${r + 1}, column ${c + 1}`}
                        onChange={event => apply(setCell(model, r, c, event.target.value))}
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
          <span className="sx-edit-spacer" />
          {model.hlines.length > 0 && (
            <button
              type="button"
              className="sx-edit-chip"
              title="\hline rules become \toprule, \midrule and \bottomrule, without vertical rules (adds booktabs)"
              onClick={booktabs}
            >
              Cleaner rules (booktabs)
            </button>
          )}
        </div>
        <div className="sx-edit-fields">
          <label className="sx-edit-field">
            <span>
              Caption
              {!model.caption?.text && <em> · missing</em>}
            </span>
            <input
              className={classNames('sx-edit-input', { 'sx-edit-input-missing': !model.caption?.text })}
              value={model.caption?.text ?? ''}
              placeholder="Add a caption"
              onChange={event => apply(setCaption(view.state, model, event.target.value))}
            />
          </label>
          <label className="sx-edit-field">
            <span>
              Label
              {!model.label?.text && <em> · missing</em>}
            </span>
            <input
              className={classNames('sx-edit-input', { 'sx-edit-input-missing': !model.label?.text })}
              value={model.label?.text ?? ''}
              placeholder="tab:"
              onChange={event => apply(setLabel(view.state, model, cleanLabel(event.target.value)))}
            />
          </label>
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
      <Head title="Edit list" close={close} />
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
                <input
                  ref={element => {
                    inputs.current[i] = element
                  }}
                  className="sx-edit-input sx-edit-item-input"
                  value={item.text}
                  aria-label={`Item ${i + 1}`}
                  onChange={event => apply(setItemText(model, i, event.target.value))}
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
                  {item.text || '…'} <em>(more in the editor)</em>
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
