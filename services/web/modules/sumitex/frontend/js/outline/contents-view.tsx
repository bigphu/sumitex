/**
 * The Outline's Contents tab: the whole document's headings as one tree,
 * nested by level across every file the main file pulls in (document-map.ts),
 * so a paper split into many files reads like its table of contents.
 *
 * - The open file's headings are its live outline; the others come from the
 *   project text. Files don't show: a heading's file and line are in its
 *   tooltip, and a click opens that file at the heading (or, in the open
 *   file, jumps there; a double-click also shows it in the PDF).
 * - It starts folded to the top level, with the path to where you are
 *   unfolded; that path folds again when you move on. What you unfold or
 *   fold yourself stays that way. Where you are is the heading the cursor
 *   is under: its row is marked and kept in view.
 * - The filter box finds headings anywhere (case and accents ignored, so
 *   "phuong phap" finds "Phương pháp"); Enter opens the first, Esc clears.
 */
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import classNames from 'classnames'
import MaterialIcon from '@/shared/components/material-icon'
import type { OutlineItemData } from '@/features/ide-react/types/outline'
import { plainText } from './scan-blocks'
import type { DocumentMap, MappedHeading } from './document-map'

export type ContentsEntry = {
  key: string
  title: string
  level: number
  path: string
  line: number
  /** In the open file (jump within it rather than open a file) */
  live: boolean
  /** In the open file's part (its own or a file it pulls in): the line there */
  anchor: number | null
}

type Node = { entry: ContentsEntry; children: Node[]; size: number }

const titleOf = (title: string) => plainText(title) || title

// Lower case, accents gone: what the filter compares
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()

/** The document's headings in reading order, the open file's from its live outline */
export function contentsEntries(
  map: DocumentMap | null,
  /** The editor's live outline, or null while it still holds another file */
  liveItems: OutlineItemData[] | null,
  currentPath: string | null,
  hasLiveOutline: boolean
): ContentsEntry[] {
  const fromMap = (heading: MappedHeading): ContentsEntry => ({
    key: `${heading.path}:${heading.line}:${heading.title}`,
    title: titleOf(heading.title),
    level: heading.level,
    path: heading.path,
    line: heading.line,
    live: false,
    anchor: null,
  })
  if (!hasLiveOutline) {
    // An image or a PDF open: the whole document, if there is one
    return (map?.before ?? []).map(fromMap)
  }
  const flat: OutlineItemData[] = []
  const walk = (items: OutlineItemData[]) =>
    items.forEach(item => {
      flat.push(item)
      if (item.children) walk(item.children)
    })
  if (liveItems) walk(liveItems)
  else
    // Just switched files: the open file's headings as last saved, in place
    for (const heading of map?.currentHeadings ?? []) {
      flat.push({ line: heading.line, title: heading.title, level: heading.level })
    }
  const live: { line: number; entries: ContentsEntry[] }[] = [
    ...flat.map(item => ({
      line: item.line,
      entries: [
        {
          key: `${currentPath}:${item.line}:${item.title}`,
          title: titleOf(item.title),
          level: item.level ?? 4,
          path: currentPath ?? '',
          line: item.line,
          live: true,
          anchor: item.line,
        },
      ],
    })),
    ...(map?.includesInCurrent ?? []).map(include => ({
      line: include.line,
      entries: include.headings.map(heading => ({
        ...fromMap(heading),
        anchor: include.line,
      })),
    })),
  ].sort((a, b) => a.line - b.line)
  const current = live.flatMap(part => part.entries)
  if (!map?.inDocument) return current
  return [...map.before.map(fromMap), ...current, ...map.after.map(fromMap)]
}

function nest(entries: ContentsEntry[]): Node[] {
  const roots: Node[] = []
  const stack: Node[] = []
  for (const entry of entries) {
    const node: Node = { entry, children: [], size: 0 }
    while (stack.length && stack[stack.length - 1].entry.level >= entry.level) {
      stack.pop()
    }
    for (const parent of stack) parent.size++
    if (stack.length) stack[stack.length - 1].children.push(node)
    else roots.push(node)
    stack.push(node)
  }
  return roots
}

type RowProps = {
  node: Node
  depth: number
  expanded: Set<string>
  toggle: (key: string) => void
  here: string | null
  hereRef: React.MutableRefObject<HTMLButtonElement | null>
  choose: (entry: ContentsEntry, inPdf: boolean) => void
}

const Row = memo(function Row({
  node,
  depth,
  expanded,
  toggle,
  here,
  hereRef,
  choose,
}: RowProps) {
  const { entry, children } = node
  const open = expanded.has(entry.key)
  const isHere = here === entry.key
  return (
    <li role="treeitem" aria-expanded={children.length ? open : undefined}>
      <div
        className={classNames('sx-contents-row', { 'sx-contents-here': isHere })}
        style={{ paddingLeft: `calc(${depth} * var(--sx-contents-indent))` }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            className="sx-contents-fold"
            aria-label={open ? 'Fold' : 'Unfold'}
            onClick={() => toggle(entry.key)}
          >
            <MaterialIcon type={open ? 'keyboard_arrow_down' : 'keyboard_arrow_right'} />
          </button>
        ) : (
          <span className="sx-contents-fold" aria-hidden="true" />
        )}
        <button
          type="button"
          ref={isHere ? hereRef : undefined}
          className="sx-contents-link"
          title={`${entry.title} · ${entry.path}, line ${entry.line}`}
          aria-current={isHere ? 'location' : undefined}
          onClick={event => choose(entry, event.detail === 2)}
          translate="no"
        >
          {entry.title}
        </button>
        {!open && node.size > 0 && (
          <span className="sx-contents-count" title={`${node.size} inside`}>
            {node.size}
          </span>
        )}
      </div>
      {open && children.length > 0 && (
        <ul role="group">
          {children.map(child => (
            <Row
              key={child.entry.key}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              here={here}
              hereRef={hereRef}
              choose={choose}
            />
          ))}
        </ul>
      )}
    </li>
  )
})

export default function ContentsView({
  entries,
  cursorLine,
  settling,
  jumpToLine,
  openHeading,
  emptyText,
}: {
  entries: ContentsEntry[]
  /** Just switched files: keep where you are until the cursor is known */
  settling: boolean
  /** The cursor's line in the open file (-1 when unknown) */
  cursorLine: number
  jumpToLine: (line: number, syncToPdf: boolean) => void
  openHeading: (heading: MappedHeading) => void
  emptyText: string
}) {
  const tree = useMemo(() => nest(entries), [entries])
  const [query, setQuery] = useState('')

  // Where you are: the last heading of the open file's part at or above the
  // cursor; with the cursor above its first one, the last heading before it
  const computedHere = useMemo(() => {
    let found: ContentsEntry | null = null
    let seenOpenPart = false
    for (const entry of entries) {
      if (entry.anchor !== null) {
        seenOpenPart = true
        if (entry.anchor <= cursorLine) found = entry
        else break
      } else if (seenOpenPart) {
        break
      } else {
        found = entry
      }
    }
    return found?.key ?? null
  }, [entries, cursorLine])
  // While switching files the cursor still reports the old file's line:
  // hold the mark (and the unfolded way to it) where it was
  const lastHere = useRef<string | null>(null)
  if (!settling) lastHere.current = computedHere
  const here = settling ? lastHere.current : computedHere

  // The headings above `here`, to unfold
  const ancestors = useMemo(() => {
    const path: string[] = []
    const search = (nodes: Node[], trail: string[]): boolean =>
      nodes.some(node => {
        if (node.entry.key === here) {
          path.push(...trail)
          return true
        }
        return search(node.children, [...trail, node.entry.key])
      })
    if (here) search(tree, [])
    return path
  }, [tree, here])

  // Open: what you opened or closed yourself, as you left it; anything
  // else is open only while it leads to where you are, so moving on folds
  // it again and a long document stays short
  const [manual, setManual] = useState<Map<string, boolean>>(() => new Map())
  const expanded = useMemo(() => {
    const open = new Set<string>()
    for (const key of ancestors) if (manual.get(key) !== false) open.add(key)
    for (const [key, isOpen] of manual) if (isOpen) open.add(key)
    return open
  }, [ancestors, manual])

  const toggle = useCallback(
    (key: string) =>
      setManual(current =>
        new Map(current).set(key, !expanded.has(key))
      ),
    [expanded]
  )

  // Keep where you are in view
  const hereRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    hereRef.current?.scrollIntoView({ block: 'nearest' })
  }, [here, expanded])

  const choose = useCallback(
    (entry: ContentsEntry, inPdf: boolean) => {
      if (entry.live) jumpToLine(entry.line, inPdf)
      else
        openHeading({
          path: entry.path,
          line: entry.line,
          level: entry.level,
          title: entry.title,
        })
    },
    [jumpToLine, openHeading]
  )

  const matches = useMemo(() => {
    const words = fold(query).split(/\s+/).filter(Boolean)
    if (!words.length) return null
    return entries.filter(entry => {
      const title = fold(entry.title)
      return words.every(word => title.includes(word))
    })
  }, [entries, query])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') setQuery('')
    if (event.key === 'Enter' && matches?.length) choose(matches[0], false)
  }

  if (!entries.length) {
    return <p className="sx-outline-empty">{emptyText}</p>
  }

  const minLevel = Math.min(...entries.map(entry => entry.level))

  return (
    <div className="sx-contents">
      <div className="sx-contents-filter">
        <MaterialIcon type="search" />
        <input
          type="search"
          value={query}
          placeholder="Find a heading"
          aria-label="Find a heading"
          spellCheck={false}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      {matches ? (
        matches.length ? (
          <ul className="sx-contents-tree" role="listbox" aria-label="Matching headings">
            {matches.map(entry => (
              <li key={entry.key}>
                <div
                  className={classNames('sx-contents-row', {
                    'sx-contents-here': entry.key === here,
                  })}
                  style={{
                    paddingLeft: `calc(${entry.level - minLevel} * var(--sx-contents-indent))`,
                  }}
                >
                  <span className="sx-contents-fold" aria-hidden="true" />
                  <button
                    type="button"
                    className="sx-contents-link"
                    title={`${entry.title} · ${entry.path}, line ${entry.line}`}
                    onClick={event => choose(entry, event.detail === 2)}
                    translate="no"
                  >
                    {entry.title}
                  </button>
                  <span className="sx-contents-file">
                    {entry.path.split('/').pop()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sx-outline-empty">No heading matches “{query}”.</p>
        )
      ) : (
        <ul className="sx-contents-tree" role="tree" aria-label="Contents">
          {tree.map(node => (
            <Row
              key={node.entry.key}
              node={node}
              depth={0}
              expanded={expanded}
              toggle={toggle}
              here={here}
              hereRef={hereRef}
              choose={choose}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
