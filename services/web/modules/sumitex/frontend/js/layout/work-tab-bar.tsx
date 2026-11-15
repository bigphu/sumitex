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
import ProblemsWidget from './problems-widget'
import { useIsNarrow, useNarrowLayout } from './use-narrow-layout'

type LayoutChoice = 'source' | 'split' | 'pdf'

const CHOICES: { key: LayoutChoice; label: string; title: string }[] = [
  { key: 'source', label: 'Source', title: 'Source only' },
  { key: 'split', label: 'Split', title: 'Source and PDF side by side' },
  { key: 'pdf', label: 'PDF', title: 'PDF only' },
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
        ({ key, label, title }) => (
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
          {label}
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
        <ProblemsWidget />
        {openDocName && <EditorSwitch />}
        <LayoutSwitch />
      </div>
    </div>
  )
}
