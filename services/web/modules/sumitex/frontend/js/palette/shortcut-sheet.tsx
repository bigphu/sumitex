/**
 * The keyboard shortcuts sheet (Help › Keyboard shortcuts, or Ctrl+K
 * Ctrl+S). The mockup's look (frame 7: name and key chip on a hairline,
 * groups under small capitals), widened, with an index on the left like
 * the Settings dialog (frame 23):
 *
 * - a filter box: type a name or a key ("ctrl+d", "line") to narrow every
 *   group at once
 * - the groups, one under another, rows in two columns; the index jumps
 *   to a group and marks the one being read
 *
 * It holds Overleaf's keys too, regrouped, so it replaces the stock
 * sheet's body; the stock modal renders it with one marked line in
 * features/hotkeys-modal. The keys come from palette/keys.ts, the same
 * table the palette reads.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import {
  OLModal,
  OLModalBody,
  OLModalHeader,
  OLModalTitle,
} from '@/shared/components/ol/ol-modal'
import MaterialIcon from '@/shared/components/material-icon'
import { keyLabel, sheetGroups, type SheetGroup } from './keys'
import { vscodeKeysOn } from '../editor/vscode-keymap'

/** A row's keys in one chip, alternatives joined: Ctrl+S or Ctrl+Enter */
export function Keys({ keys }: { keys: string[] }) {
  return (
    <kbd className="sx-kbd">
      {keys.map((key, index) => (
        <Fragment key={key}>
          {index > 0 && <span className="sx-kbd-or"> or </span>}
          {keyLabel(key)}
        </Fragment>
      ))}
    </kbd>
  )
}

const groupId = (title: string) =>
  `sx-sheet-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`

/** Rows whose name or keys hold every typed word */
function filterGroups(groups: SheetGroup[], filter: string) {
  const words = filter.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return groups
  return groups
    .map(group => ({
      ...group,
      rows: group.rows.filter(row => {
        const text = `${row.label} ${row.keys.map(keyLabel).join(' ')}`
          .toLowerCase()
        return words.every(word => text.includes(word))
      }),
    }))
    .filter(group => group.rows.length > 0)
}

function SheetBody({ review }: { review: boolean }) {
  const [filter, setFilter] = useState('')
  const groups = useMemo(
    () => filterGroups(sheetGroups({ review }), filter),
    [review, filter]
  )
  const [current, setCurrent] = useState<string | undefined>(
    groups[0]?.title
  )
  const listRef = useRef<HTMLDivElement>(null)
  // After a click in the index, keep that group marked while the list
  // glides there (a group near the end may never reach the top)
  const pickedUntil = useRef(0)

  // Mark the group at the top of the list as the one being read
  const onScroll = () => {
    const list = listRef.current
    if (!list || Date.now() < pickedUntil.current) return
    const top = list.getBoundingClientRect().top
    let reading: string | undefined = groups[0]?.title
    for (const section of list.querySelectorAll<HTMLElement>('section')) {
      if (section.getBoundingClientRect().top - top <= 24) {
        reading = section.dataset.title
      }
    }
    // At the very bottom, the last group is the one being read
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 2) {
      reading = groups[groups.length - 1]?.title
    }
    setCurrent(reading)
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
    setCurrent(groups[0]?.title)
  }, [groups])

  const jumpTo = (title: string) => {
    const list = listRef.current
    const section = list?.querySelector<HTMLElement>(`#${groupId(title)}`)
    if (!list || !section) return
    // The list is the sections' offset parent (position: relative)
    pickedUntil.current = Date.now() + 600
    list.scrollTo({ top: section.offsetTop, behavior: 'smooth' })
    setCurrent(title)
  }

  return (
    <div className="sx-sheet">
      <nav className="sx-sheet-index" aria-label="Shortcut groups">
        <label className="sx-sheet-filter">
          <MaterialIcon type="search" unfilled />
          <input
            type="search"
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder="Filter, e.g. line or ctrl+d"
            aria-label="Filter shortcuts"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </label>
        <ul>
          {groups.map(group => (
            <li key={group.title}>
              <button
                type="button"
                className={classNames({ active: group.title === current })}
                onClick={() => jumpTo(group.title)}
              >
                <span>{group.title}</span>
                <span className="sx-sheet-count">{group.rows.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sx-sheet-list" ref={listRef} onScroll={onScroll}>
        {groups.length === 0 && (
          <p className="sx-sheet-empty">No shortcut matches “{filter}”.</p>
        )}
        {groups.map(group => (
          <section
            key={group.title}
            id={groupId(group.title)}
            data-title={group.title}
            className={classNames('sx-sheet-group', {
              current: group.title === current && groups.length > 1,
            })}
          >
            <h3>{group.title}</h3>
            <ul>
              {group.rows.map(row => (
                <li key={row.label} data-test-selector="hotkey">
                  <span className="sx-sheet-label">{row.label}</span>
                  <Keys keys={row.keys} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export default function ShortcutSheet({
  show,
  handleHide,
  animation = true,
  trackChangesVisible = false,
}: {
  show: boolean
  handleHide: () => void
  animation?: boolean
  trackChangesVisible?: boolean
}) {
  return (
    <OLModal
      size="lg"
      onHide={handleHide}
      show={show}
      animation={animation}
      className="sx-shortcut-sheet"
      themed
    >
      <OLModalHeader>
        <OLModalTitle>Keyboard shortcuts</OLModalTitle>
        <p className="sx-sheet-sub">
          {vscodeKeysOn()
            ? 'VS Code bindings'
            : 'Vim or Emacs keys are on, so the VS Code editing keys step aside'}{' '}
          · {keyLabel('Mod+K Mod+S')} opens this · every command is also in
          the command palette ({keyLabel('Mod+Shift+P')})
        </p>
      </OLModalHeader>
      <OLModalBody>
        {/* Mounted only while open, so the filter starts empty each time */}
        {show && <SheetBody review={trackChangesVisible} />}
      </OLModalBody>
    </OLModal>
  )
}
