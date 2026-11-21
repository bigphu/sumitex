/**
 * The tab bar of the editor-and-PDF island (guide 1d, step 2).
 *
 * One row across the whole island, as JetBrains does for Markdown preview:
 * the open files on the left, and at the right end the Code / Visual switch
 * and one layout button (Source only / Source and PDF / PDF only, in a
 * menu). The tabs and the Code / Visual switch are the stock components,
 * moved here; only the layout button is new.
 *
 * Mounted by one marked line in ide-react/components/layout/main-layout.tsx.
 */
import { useRef } from 'react'
import MaterialIcon from '@/shared/components/material-icon'
import {
  OLDropdown,
  OLDropdownItem,
  OLDropdownMenu,
  OLDropdownToggle,
} from '@/shared/components/ol/ol-dropdown-menu'
import { TabsContainer } from '@/features/source-editor/components/tabs/tabs-container'
import EditorSwitch from '@/features/source-editor/components/editor-switch'
import { useAreTabsEnabled } from '@/features/ide-react/hooks/use-are-tabs-enabled'
import { useLayoutContext } from '@/shared/context/layout-context'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import {
  useCompactSidePanel,
  useIsNarrow,
  useNarrowLayout,
} from './use-narrow-layout'
import { useGlobalShortcuts } from './use-global-shortcuts'
import { isMac } from '@/shared/utils/os'
import PdfPillExtras from './pdf-pill-extras'
import FileTreeExtras from '../files/file-tree-extras'
import { useTabOverflow } from './use-tab-overflow'

type LayoutChoice = 'source' | 'split' | 'pdf'

const MOD = isMac ? 'Cmd' : 'Ctrl'

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
  shortcut: string
  Icon: () => JSX.Element
}[] = [
  { key: 'source', label: 'Source only', shortcut: `${MOD}+1`, Icon: SourceIcon },
  { key: 'split', label: 'Source and PDF', shortcut: `${MOD}+2`, Icon: SplitIcon },
  { key: 'pdf', label: 'PDF only', shortcut: `${MOD}+3`, Icon: PdfIcon },
]

// One button for the layout (it used to be three side by side): it shows the
// current layout's icon and opens a short menu with all three and their keys
function LayoutSwitch() {
  const { pdfLayout, view, changeLayout, detachRole } = useLayoutContext()
  const narrow = useIsNarrow()

  // A detached PDF lives in another window, so there is nothing to switch
  if (detachRole === 'detacher') return null

  const current: LayoutChoice =
    pdfLayout === 'sideBySide' ? 'split' : view === 'pdf' ? 'pdf' : 'source'
  const { Icon: CurrentIcon, label: currentLabel } =
    CHOICES.find(({ key }) => key === current) ?? CHOICES[0]

  const choose = (choice: LayoutChoice) => {
    if (choice === 'split') changeLayout('sideBySide')
    else changeLayout('flat', choice === 'pdf' ? 'pdf' : 'editor')
  }

  return (
    <OLDropdown className="sx-layout-menu" align="end">
      <OLDropdownToggle
        id="sx-layout-menu-toggle"
        variant="ghost"
        className="sx-layout-toggle no-default-caret"
        aria-label={`Layout: ${currentLabel}`}
      >
        <CurrentIcon />
        <MaterialIcon type="keyboard_arrow_down" className="sx-layout-chevron" />
      </OLDropdownToggle>
      <OLDropdownMenu>
        {CHOICES.filter(({ key }) => !(narrow && key === 'split')).map(
          ({ key, label, shortcut, Icon }) => (
            <OLDropdownItem
              key={key}
              as="button"
              active={current === key}
              aria-current={current === key}
              leadingIcon={<Icon />}
              trailingIcon={<kbd className="sx-layout-key">{shortcut}</kbd>}
              onClick={() => choose(key)}
            >
              {label}
            </OLDropdownItem>
          )
        )}
      </OLDropdownMenu>
    </OLDropdown>
  )
}

export default function WorkTabBar() {
  const tabsEnabled = useAreTabsEnabled()
  const { openDocName } = useEditorOpenDocContext()
  const narrow = useNarrowLayout() // below 900px: no Split, side panels as drawers
  useGlobalShortcuts(narrow) // Ctrl+1/2/3, Ctrl+Shift+E/H/M, Ctrl+, …
  useCompactSidePanel() // below 1500px: the side panel starts closed
  const { focusMode } = useLayoutContext()
  const tabsRef = useRef<HTMLDivElement>(null)
  useTabOverflow(tabsRef, !focusMode) // no scrollbar: fade the side with hidden tabs

  // Zen has no tab bar (mockup frame 3); the PDF pill keeps its extras
  if (focusMode) return <PdfPillExtras />

  return (
    <div className="sx-work-tabbar">
      <div className="sx-work-tabbar-tabs" ref={tabsRef}>
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
