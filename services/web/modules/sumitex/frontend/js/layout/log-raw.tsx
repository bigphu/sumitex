/**
 * The LOG tab of the log panel: the raw TeX output, made easy to scan.
 * - Runs of file-loading lines ("(/usr/share/texlive/…/foo.sty") fold into
 *   one "Loaded 84 files" line that opens on click.
 * - A search box keeps only the lines that match.
 * - "Jump to first error" scrolls to the first "! …" line.
 */
import { useMemo, useRef, useState } from 'react'
import classNames from 'classnames'

type Block =
  | { kind: 'line'; text: string; index: number }
  | { kind: 'fold'; lines: string[]; index: number }

// Lines that only report packages being loaded and set up: files opened or
// closed, "Package: …" / "File: …" banners, registers being allocated, and
// the info messages packages print while loading
const FILES = /\.(sty|cls|def|cfg|clo|fd|tex|ldf|dfu|map|enc|pfb|cnf|lua)\b/g
const NOISE = [
  /^[\s()<>[\]{}]*(\(?\/[^\s()]+\.(sty|cls|def|cfg|clo|fd|tex|ldf|dfu|map|enc|pfb|cnf|lua)\)?[\s()<>[\]{}]*)+$/,
  /^[\s)]*$/,
  /^[\s)]*\(?\/\S+/,
  /^(Package|File|Document Class|Language|Dictionary|For additional information on amsmath)\b/,
  /^\\[A-Za-z@_:]+=\\(count|dimen|skip|muskip|toks|box|read|write|insert|language|attribute|catcodetable)\d+/,
  /^[\w .*-]+ Info:/, // LaTeX Font Info:, Package babel Info:, …
  /^\*geometry\* |^\* /, // geometry's verbose layout report
  /^Now handling font encoding |^\.\.\. no UTF-8 mapping file/,
  /^\[Loading MPS to PDF converter/,
  /^\\openout\d+ = /,
  /^ABD: EveryShipout/,
]
// The "(babel)      …" continuation of a message: noise only after noise,
// so a warning keeps its own continuation lines
const CONTINUATION = /^\([\w.-]+\)\s{2,}/
// The log wraps at 79 characters, so a full-length noise line continues on
// the next one
const WRAP = 79

const isProblem = (text: string) =>
  text.startsWith('!') ||
  /(Warning|Error):|^(Overfull|Underfull) /.test(text)

function toBlocks(raw: string): Block[] {
  const blocks: Block[] = []
  const lines = raw.split('\n')
  let runStart = -1 // index of the first line in the current noise run
  const flush = (end: number) => {
    if (runStart === -1) return
    const run = lines.slice(runStart, end)
    if (run.length >= 3) {
      blocks.push({ kind: 'fold', lines: run, index: runStart })
    } else {
      run.forEach((text, i) => blocks.push({ kind: 'line', text, index: runStart + i }))
    }
    runStart = -1
  }
  let afterNoise = false
  let continues = false // the previous line was noise cut at the wrap width
  lines.forEach((text, index) => {
    const noise =
      !isProblem(text) &&
      (continues ||
        NOISE.some(re => re.test(text)) ||
        (afterNoise && CONTINUATION.test(text)))
    afterNoise = noise
    continues = noise && text.length >= WRAP
    if (noise) {
      if (runStart === -1) runStart = index
    } else {
      flush(index)
      blocks.push({ kind: 'line', text, index })
    }
  })
  flush(lines.length)
  return blocks
}

function foldLabel(lines: string[]) {
  const files = lines.join('\n').match(FILES)?.length ?? 0
  return files > 0
    ? `Loaded ${files} files · ${lines.length} lines`
    : `${lines.length} lines of package info`
}

function Fold({ lines }: { lines: string[] }) {
  const [open, setOpen] = useState(false)
  return open ? (
    <>
      <button type="button" className="sx-raw-fold" onClick={() => setOpen(false)}>
        ▾ {foldLabel(lines)}
      </button>
      {lines.map((line, i) => (
        <div key={i} className="sx-raw-line sx-raw-noise">{line}</div>
      ))}
    </>
  ) : (
    <button type="button" className="sx-raw-fold" onClick={() => setOpen(true)}>
      ▸ {foldLabel(lines)}
    </button>
  )
}

export default function LogRaw({ rawLog }: { rawLog: string }) {
  const [query, setQuery] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const blocks = useMemo(() => toBlocks(rawLog), [rawLog])
  const needle = query.trim().toLowerCase()

  const jumpToError = () => {
    setQuery('')
    window.requestAnimationFrame(() => {
      bodyRef.current
        ?.querySelector('.sx-raw-error')
        ?.scrollIntoView({ block: 'center' })
    })
  }

  return (
    <div className="sx-raw">
      <div className="sx-raw-tools">
        <input
          type="search"
          className="sx-raw-search"
          placeholder="Search the log"
          aria-label="Search the log"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <button type="button" className="sx-raw-jump" onClick={jumpToError}>
          Jump to first error
        </button>
      </div>
      <div className="sx-raw-body" ref={bodyRef}>
        {needle
          ? rawLog
              .split('\n')
              .filter(line => line.toLowerCase().includes(needle))
              .map((line, i) => (
                <div key={i} className="sx-raw-line">{line}</div>
              ))
          : blocks.map(block =>
              block.kind === 'fold' ? (
                <Fold key={`f${block.index}`} lines={block.lines} />
              ) : (
                <div
                  key={block.index}
                  className={classNames('sx-raw-line', {
                    'sx-raw-error': block.text.startsWith('!'),
                  })}
                >
                  {block.text || ' '}
                </div>
              )
            )}
      </div>
    </div>
  )
}
