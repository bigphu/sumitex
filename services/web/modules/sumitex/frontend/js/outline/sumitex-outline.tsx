/**
 * The Outline with blocks (guide Phase 6, features list 11, v1), in its
 * own entry of the left strip (outline-rail-entry.tsx).
 *
 * - Blocks off (the default): the stock section outline, unchanged.
 * - Blocks on ([▦] in the header, or the palette's "Outline: Show/Hide
 *   blocks"): figures, tables, graphs, lists, equations, code, theorems
 *   and notes as rows under their section, with a type filter. Sections
 *   always stay, so filtering never loses your place.
 * - A row: icon and short title; a dot when something is missing (no
 *   caption, no label, a label this file never refers to). Hovering shows
 *   a card with the label, the lines, a table's size and a preview (the
 *   image, or the formula). Click jumps to it; double-click also shows it
 *   in the PDF. The row at the cursor is highlighted.
 * - A collapsed section shows how many blocks it holds.
 * - The open file only, as the stock outline; editing happens in the
 *   editor (edit pop-ups come in a later version).
 */
import {
  Dispatch,
  memo,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import classNames from 'classnames'
import MaterialIcon from '@/shared/components/material-icon'
import { useOutlineContext } from '@/features/ide-react/context/outline-context'
import useNestedOutline from '@/features/outline/hooks/use-nested-outline'
import OutlineRoot from '@/features/outline/components/outline-root'
import { OutlineItemToggleButton } from '@/features/outline/components/outline-item-toggle-button'
import { OutlineItemData } from '@/features/ide-react/types/outline'
import { useProjectContext } from '@/shared/context/project-context'
import { useFileTreePathContext } from '@/features/file-tree/contexts/file-tree-path'
import useEventListener from '@/shared/hooks/use-event-listener'
import { loadMathJax } from '@/features/mathjax/load-mathjax'
import { BLOCK_KINDS, KIND_ORDER } from './block-types'
import type { Block } from './scan-blocks'
import {
  BlockFilter,
  getBlockFilter,
  getBlocks,
  getShowBlocks,
  setBlockFilter,
  setShowBlocks,
  subscribeOutline,
} from './blocks-store'

const HOVER_DELAY_MS = 350

type JumpToLine = (line: number, syncToPdf: boolean) => void

/** Sections in document order, each with the blocks that come under it */
function attachBlocks(sections: OutlineItemData[], blocks: Block[]) {
  const flat: OutlineItemData[] = []
  const walk = (items: OutlineItemData[]) => {
    for (const item of items) {
      flat.push(item)
      if (item.children) walk(item.children)
    }
  }
  walk(sections)
  flat.sort((a, b) => a.line - b.line)
  const owned = new Map<OutlineItemData | null, Block[]>()
  for (const block of blocks) {
    let owner: OutlineItemData | null = null
    for (const section of flat) {
      if (section.line <= block.line) owner = section
      else break
    }
    owned.set(owner, [...(owned.get(owner) ?? []), block])
  }
  return owned
}

const matches = (filter: BlockFilter) => (block: Block) =>
  filter === 'all' ||
  (filter === 'problems' ? block.problems.length > 0 : block.kind === filter)

/** How many shown blocks a section holds, its subsections included */
function countIn(
  item: OutlineItemData,
  owned: Map<OutlineItemData | null, Block[]>
): number {
  return (
    (owned.get(item)?.length ?? 0) +
    (item.children ?? []).reduce((sum, child) => sum + countIn(child, owned), 0)
  )
}

// ---------------------------------------------------------------- hover card

type Card = { block: Block; x: number; y: number }

function MathPreview({ math }: { math: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let live = true
    loadMathJax()
      .then(async MathJax => {
        const node = await MathJax.tex2svgPromise(math, { display: true })
        if (live && ref.current) ref.current.replaceChildren(node)
      })
      .catch(() => {
        if (live && ref.current) ref.current.textContent = math
      })
    return () => {
      live = false
    }
  }, [math])
  return <div className="sx-outline-card-math" ref={ref} />
}

function ImagePreview({ path }: { path: string }) {
  const { previewByPath } = useFileTreePathContext()
  const preview = previewByPath(path)
  if (!preview)
    return <p className="sx-outline-card-note">{path} isn’t in the project</p>
  if (!/^(png|jpe?g|gif|svg|webp)$/i.test(preview.extension)) {
    return (
      <p className="sx-outline-card-note">
        {path} ({preview.extension.toUpperCase()})
      </p>
    )
  }
  return <img className="sx-outline-card-image" src={preview.url} alt="" />
}

function BlockCard({ card }: { card: Card }) {
  const { block } = card
  const kind = BLOCK_KINDS[block.kind]
  const lines =
    block.endLine > block.line
      ? `Lines ${block.line}–${block.endLine}`
      : `Line ${block.line}`
  return createPortal(
    <div
      className="sx-outline-card"
      role="tooltip"
      style={{ left: card.x, top: card.y }}
    >
      <div className="sx-outline-card-head">
        <MaterialIcon type={kind.icon} />
        <span>{kind.name}</span>
        <span className="sx-outline-card-env">{block.name}</span>
      </div>
      {block.caption && (
        <p className="sx-outline-card-caption">{block.caption}</p>
      )}
      <dl className="sx-outline-card-facts">
        <dt>Label</dt>
        <dd>{block.label ? <code>{block.label}</code> : 'none'}</dd>
        <dt>Where</dt>
        <dd>{lines}</dd>
        {block.size && (
          <>
            <dt>Size</dt>
            <dd>
              {block.size.rows} rows × {block.size.columns} columns
            </dd>
          </>
        )}
        {block.items !== undefined && (
          <>
            <dt>Items</dt>
            <dd>{block.items}</dd>
          </>
        )}
      </dl>
      {block.problems.length > 0 && (
        <ul className="sx-outline-card-problems">
          {block.problems.map(problem => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {block.image && <ImagePreview path={block.image} />}
      {block.kind === 'equation' && block.math && (
        <MathPreview math={block.math.replace(/\\label\{[^}]*\}/g, '')} />
      )}
    </div>,
    document.body
  )
}

// ---------------------------------------------------------------------- rows

const BlockRow = memo(function BlockRow({
  block,
  current,
  jumpToLine,
  showCard,
  hideCard,
}: {
  block: Block
  current: boolean
  jumpToLine: JumpToLine
  showCard: (block: Block, element: HTMLElement) => void
  hideCard: () => void
}) {
  const kind = BLOCK_KINDS[block.kind]
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (current) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [current])
  return (
    <li
      className={classNames('outline-item sx-outline-block', {
        'sx-outline-block-current': current,
      })}
      role="treeitem"
      aria-current={current}
      aria-label={`${kind.name}: ${block.title}`}
    >
      <div className="outline-item-row">
        <button
          ref={ref}
          className={classNames('outline-item-link sx-outline-block-link', {
            'outline-item-link-highlight': current,
          })}
          onClick={event => jumpToLine(block.line, event.detail === 2)}
          onMouseEnter={event => showCard(block, event.currentTarget)}
          onMouseLeave={hideCard}
          onFocus={event => showCard(block, event.currentTarget)}
          onBlur={hideCard}
        >
          <MaterialIcon type={kind.icon} className="sx-outline-block-icon" />
          <span className="sx-outline-block-title">{block.title}</span>
          {block.problems.length > 0 && (
            <span
              className="sx-outline-dot"
              title={block.problems.join('\n')}
              aria-label={block.problems.join(', ')}
            />
          )}
        </button>
      </div>
    </li>
  )
})

type Shared = {
  owned: Map<OutlineItemData | null, Block[]>
  jumpToLine: JumpToLine
  highlightedLine: number
  cursorBlock: Block | null
  showCard: (block: Block, element: HTMLElement) => void
  hideCard: () => void
}

function Children({
  sections,
  blocks,
  shared,
}: {
  sections: OutlineItemData[]
  blocks: Block[]
  shared: Shared
}) {
  // Blocks and subsections in the order they come in the file
  const rows = [
    ...blocks.map(block => ({ line: block.line, block, section: null })),
    ...sections.map(section => ({ line: section.line, block: null, section })),
  ].sort((a, b) => a.line - b.line)
  return (
    <>
      {rows.map(row =>
        row.block ? (
          <BlockRow
            key={`b${row.block.from}`}
            block={row.block}
            current={shared.cursorBlock === row.block}
            jumpToLine={shared.jumpToLine}
            showCard={shared.showCard}
            hideCard={shared.hideCard}
          />
        ) : (
          <SectionRow
            key={`s${row.section!.line}-${row.section!.title}`}
            item={row.section!}
            shared={shared}
          />
        )
      )}
    </>
  )
}

function SectionRow({
  item,
  shared,
}: {
  item: OutlineItemData
  shared: Shared
}) {
  const [expanded, setExpanded] = useState(true)
  const blocks = shared.owned.get(item) ?? []
  const hasChildren = Boolean(item.children?.length || blocks.length)
  const count = expanded ? 0 : countIn(item, shared.owned)
  const highlighted =
    !shared.cursorBlock && shared.highlightedLine === item.line
  return (
    <li
      className={classNames('outline-item', {
        'outline-item-no-children': !hasChildren,
      })}
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-label={item.title}
      translate="no"
    >
      <div className="outline-item-row">
        {hasChildren && (
          <OutlineItemToggleButton
            expanded={expanded}
            setExpanded={setExpanded as Dispatch<SetStateAction<boolean>>}
          />
        )}
        <button
          className={classNames('outline-item-link', {
            'outline-item-link-highlight': highlighted,
          })}
          onClick={event => shared.jumpToLine(item.line, event.detail === 2)}
        >
          {item.title}
        </button>
        {count > 0 && (
          <span className="sx-outline-count" title={`${count} blocks inside`}>
            {count}
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <ul className="outline-item-list" role="group">
          <Children
            sections={item.children ?? []}
            blocks={blocks}
            shared={shared}
          />
        </ul>
      )}
    </li>
  )
}

// --------------------------------------------------------------------- panel

export default function SumitexOutline() {
  const { projectId } = useProjectContext()
  const { canShowOutline, jumpToLine, highlightedLine } = useOutlineContext()
  const outline = useNestedOutline()

  const showBlocks = useSyncExternalStore(subscribeOutline, () =>
    getShowBlocks(projectId)
  )
  const filter = useSyncExternalStore(subscribeOutline, () =>
    getBlockFilter(projectId)
  )
  const allBlocks = useSyncExternalStore(subscribeOutline, getBlocks)

  // The cursor's line, for the row to highlight
  const [cursorLine, setCursorLine] = useState(-1)
  useEventListener(
    'cursor:editor:update',
    useCallback((event: CustomEvent) => setCursorLine(event.detail.row + 1), [])
  )

  const blocks = useMemo(
    () => allBlocks.filter(matches(filter)),
    [allBlocks, filter]
  )
  const owned = useMemo(
    () => attachBlocks(outline.items, blocks),
    [outline.items, blocks]
  )
  const cursorBlock = useMemo(
    () =>
      blocks.find(
        block => cursorLine >= block.line && cursorLine <= block.endLine
      ) ?? null,
    [blocks, cursorLine]
  )
  const counts = useMemo(() => {
    const byKind = new Map<string, number>()
    for (const block of allBlocks) {
      byKind.set(block.kind, (byKind.get(block.kind) ?? 0) + 1)
      if (block.problems.length)
        byKind.set('problems', (byKind.get('problems') ?? 0) + 1)
    }
    return byKind
  }, [allBlocks])

  // The hover card, shown after a short pause
  const [card, setCard] = useState<Card | null>(null)
  const timer = useRef<number | null>(null)
  const hideCard = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    setCard(null)
  }, [])
  const showCard = useCallback((block: Block, element: HTMLElement) => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const rect = element.getBoundingClientRect()
      const x = Math.min(rect.right + 10, window.innerWidth - 320)
      const y = Math.max(8, Math.min(rect.top - 8, window.innerHeight - 360))
      setCard({ block, x, y })
    }, HOVER_DELAY_MS)
  }, [])
  useEffect(() => hideCard, [hideCard])

  const rootBlocks = owned.get(null) ?? []
  const shared: Shared = {
    owned,
    jumpToLine,
    highlightedLine,
    cursorBlock,
    showCard,
    hideCard,
  }

  return (
    <div className="sx-outline">
      <div className="sx-outline-header">
        <span className="sx-outline-title">Outline</span>
        {canShowOutline && (
          <>
            {showBlocks && (
              <select
                id="sx-outline-filter"
                className="sx-outline-filter"
                aria-label="Which blocks to show"
                value={filter}
                onChange={event =>
                  setBlockFilter(projectId, event.target.value as BlockFilter)
                }
              >
                <option value="all">All ({allBlocks.length})</option>
                {KIND_ORDER.map(kind => (
                  <option key={kind} value={kind}>
                    {BLOCK_KINDS[kind].plural} ({counts.get(kind) ?? 0})
                  </option>
                ))}
                <option value="problems">
                  Problems only ({counts.get('problems') ?? 0})
                </option>
              </select>
            )}
            <button
              type="button"
              className={classNames('sx-outline-toggle', {
                'sx-outline-toggle-on': showBlocks,
              })}
              aria-pressed={showBlocks}
              title={
                showBlocks
                  ? 'Hide blocks: sections only'
                  : 'Show blocks: figures, tables, lists, equations…'
              }
              onClick={() => setShowBlocks(projectId, !showBlocks)}
            >
              <MaterialIcon type="view_agenda" />
            </button>
          </>
        )}
      </div>

      <div className="sx-outline-body">
        {!canShowOutline ? (
          <p className="sx-outline-empty">
            Open a .tex file to see its outline.
          </p>
        ) : !showBlocks || (!outline.items.length && !allBlocks.length) ? (
          <OutlineRoot
            outline={outline.items}
            jumpToLine={jumpToLine}
            highlightedLine={highlightedLine}
          />
        ) : (
          <ul className="outline-item-list outline-item-list-root" role="tree">
            <Children
              sections={outline.items}
              blocks={rootBlocks}
              shared={shared}
            />
          </ul>
        )}
        {showBlocks &&
          filter !== 'all' &&
          blocks.length === 0 &&
          canShowOutline && (
            <p className="sx-outline-empty">
              No{' '}
              {filter === 'problems'
                ? 'blocks with problems'
                : BLOCK_KINDS[filter].plural.toLowerCase()}{' '}
              in this file.
            </p>
          )}
      </div>
      {card && <BlockCard card={card} />}
    </div>
  )
}
