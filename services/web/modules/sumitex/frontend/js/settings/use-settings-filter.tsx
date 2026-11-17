/**
 * A filter box above the Settings dialog's tab list (settingsModalFilter
 * slot), like the shortcut sheet's. Typing shows every tab's settings in
 * one list and keeps the rows whose text matches every word typed: the
 * name, the description and the choices. The tab and section names count
 * too, so "checks" lists the whole Checks tab. Esc clears it, and picking a
 * tab leaves it.
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import MaterialIcon from '@/shared/components/material-icon'
import type {
  SettingsEntry,
  SettingsTab,
} from '@/features/ide-settings/context/types'

function Results({ query, tabs }: { query: string; tabs: SettingsTab[] }) {
  const host = useRef<HTMLDivElement>(null)
  const [none, setNone] = useState(false)

  useEffect(() => {
    const root = host.current
    if (!root) return
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const matches = (text: string) =>
      words.every(word => text.toLowerCase().includes(word))
    let anyTab = false
    root.querySelectorAll<HTMLElement>('.sx-filter-tab').forEach(tab => {
      const tabName = tab.dataset.title ?? ''
      let anySection = false
      tab
        .querySelectorAll<HTMLElement>('.ide-settings-section')
        .forEach(section => {
          const title =
            section.querySelector('.ide-settings-section-title')?.textContent ??
            ''
          let anyRow = false
          for (const row of Array.from(section.children) as HTMLElement[]) {
            if (row.classList.contains('ide-settings-section-title')) continue
            const shown = matches(`${tabName} ${title} ${row.textContent}`)
            row.hidden = !shown
            anyRow ||= shown
          }
          section.hidden = !anyRow
          anySection ||= anyRow
        })
      tab.hidden = !anySection
      anyTab ||= anySection
    })
    setNone(!anyTab)
  }, [query, tabs])

  return (
    <div className="ide-settings-tab-content sx-filter-results" ref={host}>
      {tabs.map(tab => (
        <div className="sx-filter-tab" data-title={tab.title} key={tab.key}>
          <div className="sx-filter-tab-title">
            <MaterialIcon type={tab.icon} unfilled />
            {tab.title}
          </div>
          {tab.sections.map(section => (
            <div className="ide-settings-section" key={section.key}>
              {section.title && (
                <div className="ide-settings-section-title">
                  {section.title}
                </div>
              )}
              {section.settings.map(
                ({ key, component, hidden }) =>
                  !hidden && <Fragment key={key}>{component}</Fragment>
              )}
            </div>
          ))}
        </div>
      ))}
      {none && (
        <p className="sx-filter-none">No settings match “{query.trim()}”.</p>
      )}
    </div>
  )
}

export default function useSettingsFilter(
  settingsTabs: SettingsEntry[],
  setActiveTab: (tab: string | null | undefined) => void
) {
  const [query, setQuery] = useState('')
  const filtering = query.trim() !== ''
  const tabs = settingsTabs.filter(
    (tab): tab is SettingsTab => 'sections' in tab
  )

  const input = (
    <div className="sx-settings-filter">
      <MaterialIcon type="search" unfilled />
      <input
        type="search"
        placeholder="Filter settings"
        aria-label="Filter settings"
        value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          // Esc clears the filter first, then closes the dialog
          if (event.key === 'Escape' && query) {
            event.stopPropagation()
            setQuery('')
          }
        }}
      />
    </div>
  )

  return {
    input,
    results: filtering ? <Results query={query} tabs={tabs} /> : null,
    // Picking a tab leaves the filter
    onSelect: (tab: string | null | undefined) => {
      setQuery('')
      setActiveTab(tab)
    },
  }
}
