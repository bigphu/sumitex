/**
 * SumiTeX switches in Settings → Editor (settingsModalEditorTabSections
 * slot). For now: the formatting toolbar in Code mode, which the mockup
 * hides. The main menu's Insert and Format menus cover the same actions.
 */
import { useSyncExternalStore } from 'react'
import ToggleSetting from '@/features/ide-settings/components/toggle-setting'
import type { SettingsSection } from '@/features/ide-settings/context/types'
import { getCodeToolbar, setCodeToolbar, subscribePrefs } from './prefs'

function CodeToolbarSetting() {
  const checked = useSyncExternalStore(subscribePrefs, getCodeToolbar)
  return (
    <ToggleSetting
      id="sumitex-code-toolbar"
      label="Formatting toolbar in Code mode"
      description="Show the bold, italic, insert… toolbar above the code. It always shows in Visual mode."
      checked={checked}
      onChange={setCodeToolbar}
    />
  )
}

export default function useSumitexEditorSection(): SettingsSection {
  return {
    key: 'sumitex',
    title: 'SumiTeX',
    settings: [{ key: 'sumitexCodeToolbar', component: <CodeToolbarSetting /> }],
  }
}
