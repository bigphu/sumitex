/**
 * Zen's only chrome, as in the mockup (frame 3): two quiet buttons at the
 * top right, "PDF Ctrl+\" (or "Source" while the PDF shows) and "Exit zen
 * Esc", and one centred status line at the bottom: file · line · words ·
 * compile result. The stock focus-mode toolbar (logo, project name, a
 * layout menu that Zen doesn't use) is not shown; the title bar renders
 * ZenBar instead (title-bar.tsx), and the status bar ZenStatus.
 *
 * Ctrl+\ and Esc work from anywhere in Zen (use-global-shortcuts.ts).
 */
import { useLayoutContext } from '@/shared/context/layout-context'
import { useDetachCompileContext as useCompileContext } from '@/shared/context/detach-compile-context'
import { keyLabel } from '../palette/keys'

/** Zen shows the source or the PDF, never both */
export function useZenViewToggle() {
  const { view, setView } = useLayoutContext()
  const showingPdf = view === 'pdf'
  return {
    showingPdf,
    toggle: () => setView(showingPdf ? 'editor' : 'pdf'),
  }
}

export function ZenBar() {
  const { setFocusMode } = useLayoutContext()
  const { showingPdf, toggle } = useZenViewToggle()

  return (
    <nav className="sx-zen-bar" aria-label="Zen mode">
      <button type="button" className="sx-zen-button" onClick={toggle}>
        {showingPdf ? 'Source' : 'PDF'}
        <kbd className="sx-kbd">{keyLabel('Mod+\\')}</kbd>
      </button>
      <button
        type="button"
        className="sx-zen-button"
        onClick={() => setFocusMode(false)}
      >
        Exit zen
        <kbd className="sx-kbd">Esc</kbd>
      </button>
    </nav>
  )
}

function CompileResult() {
  const { compiling, logEntries } = useCompileContext()
  if (compiling) return <span className="sx-zen-status-item">Compiling…</span>
  if (!logEntries) return null
  const errors = logEntries.errors?.length ?? 0
  const warnings = logEntries.warnings?.length ?? 0
  const tone = errors ? 'error' : warnings ? 'warning' : 'ok'
  const detail = errors
    ? `${errors} error${errors > 1 ? 's' : ''}`
    : warnings
      ? `${warnings} warning${warnings > 1 ? 's' : ''}`
      : null
  return (
    <span className="sx-zen-status-item">
      <span className={`sx-zen-dot sx-zen-dot-${tone}`} aria-hidden="true" />
      {errors ? 'Failed' : 'Compiled'}
      {detail && ` · ${detail}`}
    </span>
  )
}

export function ZenStatus({
  fileName,
  line,
  words,
}: {
  fileName?: string
  line?: number
  words: number | null
}) {
  const parts = [
    fileName,
    line !== undefined ? `Ln ${line}` : null,
    words !== null ? `${words.toLocaleString()} words` : null,
  ].filter(Boolean)

  return (
    <footer className="sx-zen-status" aria-label="Status">
      {parts.map(part => (
        <span className="sx-zen-status-item" key={part}>
          {part}
        </span>
      ))}
      <CompileResult />
    </footer>
  )
}
