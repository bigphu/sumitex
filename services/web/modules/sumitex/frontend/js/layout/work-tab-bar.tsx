/**
 * The tab bar of the editor-and-PDF island (guide 1d, step 2).
 *
 * One row across the whole island, as JetBrains does for Markdown preview:
 * the open files on the left, and at the right end the Code / Visual switch
 * and the Source / Split / PDF switch. The tabs and the Code / Visual switch
 * are the stock components, moved here; only the layout switch is new.
 *
 * Mounted by one marked line in ide-react/components/layout/main-layout.tsx.
 */
import classNames from 'classnames'
import { TabsContainer } from '@/features/source-editor/components/tabs/tabs-container'
import EditorSwitch from '@/features/source-editor/components/editor-switch'
import { useAreTabsEnabled } from '@/features/ide-react/hooks/use-are-tabs-enabled'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import { useIsNarrow, useNarrowLayout } from './use-narrow-layout'
import PdfPillExtras from './pdf-pill-extras'
import FileTreeExtras from '../files/file-tree-extras'

type LayoutChoice = 'source' | 'split' | 'pdf'

// Icon buttons, as in the mockup: source only, split, PDF only
const SourceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4.5 5.5h7M4.5 8h5M4.5 10.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)
const SplitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 2.5v11" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)
const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 1.8h5.2L12.5 5v9.2H4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M9 2v3.3h3.3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
)

const CHOICES: {
  key: LayoutChoice
  label: string
  title: string
  Icon: () => JSX.Element
}[] = [
  { key: 'source', label: 'Source', title: 'Source only', Icon: SourceIcon },
  { key: 'split', label: 'Split', title: 'Source and PDF side by side', Icon: SplitIcon },
  { key: 'pdf', label: 'PDF', title: 'PDF only', Icon: PdfIcon },
]

function LayoutSwitch() {
  const { pdfLayout, view, changeLayout, detachRole } = useLayoutContext()
  const narrow = useIsNarrow()

  // A detached PDF lives in another window, so there is nothing to switch
  if (detachRole === 'detacher') return null

  const current: LayoutChoice =
    pdfLayout === 'sideBySide' ? 'split' : view === 'pdf' ? 'pdf' : 'source'

  const choose = (choice: LayoutChoice) => {
    if (choice === 'split') changeLayout('sideBySide')
    else changeLayout('flat', choice === 'pdf' ? 'pdf' : 'editor')
  }

  return (
    <div className="sx-segmented" role="group" aria-label="Layout">
      {CHOICES.filter(({ key }) => !(narrow && key === 'split')).map(
        ({ key, label, title, Icon }) => (
        <button
          key={key}
          type="button"
          title={title}
          aria-pressed={current === key}
          className={classNames('sx-segmented-item', {
            'sx-segmented-item-active': current === key,
          })}
          onClick={() => choose(key)}
        >
          <Icon />
          <span className="visually-hidden">{label}</span>
        </button>
        )
      )}
    </div>
  )
}

export default function WorkTabBar() {
  const tabsEnabled = useAreTabsEnabled()
  const { openDocName } = useEditorOpenDocContext()
  useNarrowLayout() // below 900px: no Split, side panels as drawers

  return (
    <div className="sx-work-tabbar">
      <div className="sx-work-tabbar-tabs">
        {tabsEnabled ? (
          <TabsContainer />
        ) : (
          <span className="sx-work-tabbar-name">{openDocName}</span>
        )}
      </div>
      <div className="sx-work-tabbar-end">
        {openDocName && <EditorSwitch />}
        <LayoutSwitch />
      </div>
      <PdfPillExtras />
      <FileTreeExtras />
    </div>
  )
}
