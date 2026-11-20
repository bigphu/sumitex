/**
 * The symbol picker (mockup frame 31): a search box, the groups (Greek,
 * Arrows, Operators, Relations, Misc, Recent) and a grid of symbols. Type
 * part of a name ("lam" finds λ), move with the arrow keys, Enter
 * inserts. The footer shows the LaTeX for the symbol in focus, and says
 * when it adds a package. Used in the equation pop-up and at the cursor
 * in the editor (symbol-picker-at-cursor.tsx).
 */
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import {
  findSymbols,
  recentSymbols,
  rememberSymbol,
  SYMBOL_GROUPS,
  type MathSymbol,
} from './symbol-data'

const COLUMNS = 8

export default function SymbolPicker({
  onPick,
  onClose,
  autoFocus = true,
}: {
  onPick: (symbol: MathSymbol) => void
  onClose?: () => void
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState(() => (recentSymbols().length ? 'recent' : 'greek'))
  const [active, setActive] = useState(0)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) search.current?.focus()
  }, [autoFocus])

  const groups = useMemo(
    () => [...SYMBOL_GROUPS, { key: 'recent', title: 'Recent', symbols: recentSymbols() }],
    // Recent is read again whenever the group changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group]
  )
  const shown = query.trim()
    ? findSymbols(query)
    : (groups.find(g => g.key === group)?.symbols ?? [])
  const current = shown[Math.min(active, shown.length - 1)]

  const pick = (symbol: MathSymbol | undefined) => {
    if (!symbol) return
    rememberSymbol(symbol)
    onPick(symbol)
  }

  const keyDown = (event: KeyboardEvent) => {
    const move = (by: number) => {
      event.preventDefault()
      setActive(i => Math.max(0, Math.min(shown.length - 1, i + by)))
    }
    if (event.key === 'ArrowRight') move(1)
    else if (event.key === 'ArrowLeft') move(-1)
    else if (event.key === 'ArrowDown') move(COLUMNS)
    else if (event.key === 'ArrowUp') move(-COLUMNS)
    else if (event.key === 'Enter') {
      event.preventDefault()
      pick(current)
    } else if (event.key === 'Escape' && onClose) {
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
  }

  return (
    <div className="sx-symbols" onKeyDown={keyDown}>
      <input
        ref={search}
        className="sx-edit-input sx-symbols-search"
        placeholder="Search symbols: lam, arrow, leq…"
        aria-label="Search symbols"
        value={query}
        onChange={event => {
          setQuery(event.target.value)
          setActive(0)
        }}
      />
      {!query.trim() && (
        <div className="sx-symbols-groups" role="tablist">
          {groups.map(g => (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={group === g.key}
              className={classNames('sx-symbols-group', { 'sx-symbols-group-on': group === g.key })}
              onClick={() => {
                setGroup(g.key)
                setActive(0)
              }}
            >
              {g.title}
            </button>
          ))}
        </div>
      )}
      <div className="sx-symbols-grid" role="listbox" aria-label="Symbols">
        {shown.map((symbol, i) => (
          <button
            key={`${symbol.tex}-${i}`}
            type="button"
            role="option"
            aria-selected={i === active}
            title={symbol.tex}
            className={classNames('sx-symbols-cell', { 'sx-symbols-cell-on': i === active })}
            onMouseEnter={() => setActive(i)}
            // Keep the focus where the text goes
            onMouseDown={event => event.preventDefault()}
            onClick={() => pick(symbol)}
          >
            {symbol.char}
          </button>
        ))}
        {shown.length === 0 && (
          <p className="sx-symbols-none">
            {query.trim() ? 'No symbol by that name.' : 'Symbols you use show here.'}
          </p>
        )}
      </div>
      <div className="sx-symbols-foot">
        {current ? (
          <>
            <span className="sx-symbols-char">{current.char}</span>
            <code>{current.tex}</code>
            <span>
              Enter inserts
              {current.package ? ` · adds ${current.package}` : ''}
            </span>
          </>
        ) : (
          <span>Symbols from amssymb add the package</span>
        )}
      </div>
    </div>
  )
}
