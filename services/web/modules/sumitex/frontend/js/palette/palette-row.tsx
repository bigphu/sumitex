/**
 * The palette's look from the mockup (frames 2 and 17), rendered by a few
 * marked lines in features/command-palette/components/command-palette-body:
 *
 * - a search icon and an "esc" key in the search box
 * - chips under it for the prefixes: @ sections, # labels, : line,
 *   > commands (click one to type it)
 * - a heading above each group of results (Recent files, Commands…)
 * - per row: an icon, the title with the typed words highlighted, the
 *   folder or kind in grey, and keys or a file:line on the right
 */
import type { Dispatch, SetStateAction } from 'react'
import classNames from 'classnames'
import MaterialIcon from '@/shared/components/material-icon'
import type { CommandPaletteSearchResult } from '@/features/command-palette/types'
import type { PaletteGroup } from './palette-extras'
import { COMMAND_KEYS } from './keys'
import { Keys } from './shortcut-sheet'

export function groupOf(result: CommandPaletteSearchResult): PaletteGroup {
  if (result.sumitex?.group) return result.sumitex.group
  switch (result.eventSegmentation.source) {
    case 'file':
      return 'Files'
    case 'jump-to-line':
      return 'Go to line'
    default:
      return 'Commands'
  }
}

/** The heading above the first row of each group */
export function PaletteGroupHeader({
  results,
  index,
}: {
  results: CommandPaletteSearchResult[]
  index: number
}) {
  const group = groupOf(results[index])
  if (index > 0 && groupOf(results[index - 1]) === group) return null
  return (
    <div className="sx-palette-group" role="presentation">
      {group}
    </div>
  )
}

// The words to highlight: the query without its prefix or a :line suffix
const queryWords = (query: string) =>
  query
    .replace(/^[>@#:]/, '')
    .replace(/:\d+(,\d+)?$/, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0)

function Highlighted({ text, query }: { text: string; query: string }) {
  const words = queryWords(query)
  if (words.length === 0) return <>{text}</>

  // Mark every match of every word, then merge overlapping ranges
  const lower = text.toLowerCase()
  const ranges: [number, number][] = []
  for (const word of words) {
    for (let at = lower.indexOf(word); at !== -1; at = lower.indexOf(word, at + 1)) {
      ranges.push([at, at + word.length])
    }
  }
  if (ranges.length === 0) return <>{text}</>
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([...range])
  }

  const parts = []
  let pos = 0
  for (const [from, to] of merged) {
    if (from > pos) parts.push(text.slice(pos, from))
    parts.push(<mark key={from}>{text.slice(from, to)}</mark>)
    pos = to
  }
  parts.push(text.slice(pos))
  return <>{parts}</>
}

function FileIcon({ name }: { name: string }) {
  const type = /\.pdf$/i.test(name)
    ? 'picture_as_pdf'
    : /\.(png|jpe?g|gif|svg|eps|webp)$/i.test(name)
      ? 'image'
      : 'description'
  return <MaterialIcon type={type} unfilled className="sx-palette-icon" />
}

/** A row's contents, inside the stock row button */
export function PaletteResultContent({
  result,
  query,
}: {
  result: CommandPaletteSearchResult
  query: string
}) {
  const extras = result.sumitex ?? {}
  const segment = result.eventSegmentation
  const keys =
    segment.source === 'command-registry' ? COMMAND_KEYS[segment.item] : undefined
  const isFile = segment.source === 'file'

  return (
    <div
      className="sx-palette-row"
      style={
        extras.indent ? { paddingLeft: `${extras.indent * 1.1}em` } : undefined
      }
    >
      {isFile ? (
        <FileIcon name={result.title} />
      ) : (
        extras.glyph && (
          <span className="sx-palette-icon sx-palette-glyph">{extras.glyph}</span>
        )
      )}
      <span className="sx-palette-title command-palette-result-title">
        <Highlighted text={result.title} query={query} />
      </span>
      {result.description && (
        <span className="sx-palette-desc">{result.description}</span>
      )}
      <span className="sx-palette-spacer" />
      {extras.location && (
        <span className="sx-palette-location">{extras.location}</span>
      )}
      {keys && <Keys keys={keys} />}
    </div>
  )
}

const CHIPS: { prefix: string; label: string }[] = [
  { prefix: '@', label: 'sections & blocks' },
  { prefix: '#', label: 'labels' },
  { prefix: ':', label: 'line' },
  { prefix: '>', label: 'commands' },
]

/** Prefix chips under the search box; clicking one types it */
export function PaletteChips({
  query,
  setQuery,
}: {
  query: string
  setQuery: Dispatch<SetStateAction<string>>
}) {
  return (
    <div className="sx-palette-chips">
      {CHIPS.map(({ prefix, label }) => (
        <button
          type="button"
          key={prefix}
          className={classNames('sx-palette-chip', {
            active: query.startsWith(prefix),
          })}
          // Keep the focus in the search box
          onMouseDown={event => event.preventDefault()}
          onClick={() =>
            setQuery(current =>
              current.startsWith(prefix) ? '' : `${prefix} `
            )
          }
        >
          <b>{prefix}</b> {label}
        </button>
      ))}
    </div>
  )
}

export function PaletteSearchIcon() {
  return <MaterialIcon type="search" unfilled className="sx-palette-search" />
}

export function PaletteEsc({ onHide }: { onHide: () => void }) {
  return (
    <button
      type="button"
      className="sx-palette-esc"
      onClick={onHide}
      aria-label="Close"
    >
      esc
    </button>
  )
}
