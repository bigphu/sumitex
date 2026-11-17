import MaterialIcon from '@/shared/components/material-icon'

import { Nav, NavLink, TabContainer, TabContent } from 'react-bootstrap'
import { SettingsEntry } from '../context/types'
import SettingsTabPane from './settings-tab-pane'
import importOverleafModules from '../../../../macros/import-overleaf-module.macro'

// SumiTeX: a filter above the tab list (settingsModalFilter slot)
type SettingsFilter = (
  settingsTabs: SettingsEntry[],
  setActiveTab: (tab: string | null | undefined) => void
) => {
  input: React.ReactNode
  results: React.ReactNode | null
  onSelect: (tab: string | null | undefined) => void
}
const noFilter: SettingsFilter = (_tabs, setActiveTab) => ({
  input: null,
  results: null,
  onSelect: setActiveTab,
})
const [filterModule] = importOverleafModules('settingsModalFilter')
const useSettingsFilter: SettingsFilter =
  filterModule?.import.default ?? noFilter

export const SettingsModalBody = ({
  activeTab,
  setActiveTab,
  settingsTabs,
}: {
  activeTab: string | null | undefined
  setActiveTab: (tab: string | null | undefined) => void
  settingsTabs: SettingsEntry[]
}) => {
  const filter = useSettingsFilter(settingsTabs, setActiveTab) // SumiTeX
  return (
    <TabContainer
      transition={false}
      onSelect={filter.onSelect}
      activeKey={activeTab ?? undefined}
      id="ide-settings-tabs"
    >
      <div className="d-flex flex-row">
        <Nav
          activeKey={activeTab ?? undefined}
          className="d-flex flex-column ide-settings-tab-nav"
        >
          {filter.input /* SumiTeX */}
          {settingsTabs.map(entry => (
            <SettingsNavLink entry={entry} key={entry.key} />
          ))}
        </Nav>
        {filter.results ?? ( // SumiTeX: matching settings while filtering
          <TabContent className="ide-settings-tab-content">
            {settingsTabs
              .filter(t => 'sections' in t)
              .map(tab => (
                <SettingsTabPane tab={tab} key={tab.key} />
              ))}
          </TabContent>
        )}
      </div>
    </TabContainer>
  )
}

const SettingsNavLink = ({ entry }: { entry: SettingsEntry }) => {
  if ('href' in entry) {
    return (
      <a
        href={entry.href}
        target="_blank"
        rel="noopener"
        className="ide-settings-tab-link ide-settings-tab-link-anchor"
      >
        <MaterialIcon
          className="ide-settings-tab-link-icon"
          type={entry.icon}
          unfilled
        />
        <span>{entry.title}</span>
        <div className="flex-grow-1" />
        <MaterialIcon
          type="open_in_new"
          className="ide-settings-tab-link-external"
        />
      </a>
    )
  } else {
    return (
      <>
        <NavLink
          eventKey={entry.key}
          className="ide-settings-tab-link ide-settings-tab-link-button"
          key={entry.key}
          as="button"
        >
          <MaterialIcon
            className="ide-settings-tab-link-icon"
            type={entry.icon}
            unfilled
          />
          <span>{entry.title}</span>
          <div className="flex-grow-1" />
        </NavLink>
      </>
    )
  }
}
