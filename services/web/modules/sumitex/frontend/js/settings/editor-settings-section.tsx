/**
 * SumiTeX switches in Settings → Editor (settingsModalEditorTabSections
 * slot):
 * - the formatting toolbar in Code mode, which the mockup hides (the main
 *   menu's Insert and Format menus cover the same actions)
 * - math auto-expansion (editor/math-auto-expand.ts), and the user's own
 *   rules for it
 */
import { useState, useSyncExternalStore } from 'react'
import ToggleSetting from '@/features/ide-settings/components/toggle-setting'
import ButtonSetting from '@/features/ide-settings/components/button-setting'
import Setting from '@/features/ide-settings/components/setting'
import OLButton from '@/shared/components/ol/ol-button'
import type { SettingsSection } from '@/features/ide-settings/context/types'
import {
  getCodeToolbar,
  getMathExpand,
  getMathRules,
  setCodeToolbar,
  setMathExpand,
  subscribePrefs,
} from './prefs'
import {
  getPersonalSnippets,
  hasAccount,
  subscribeAccountPrefs,
} from './account-prefs'
import { parseRules } from '../editor/math-auto-expand'
import { MathRulesEditor } from './math-rules-editor'
import { parseSnippetFile } from '../completions/project-snippets'
import { OPEN_PERSONAL_SNIPPETS_EVENT } from '../completions/personal-snippets'
import { useSettingsModalContext } from '@/features/ide-settings/context/settings-modal-context'

export function CodeToolbarSetting() {
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

export function MathExpandSetting() {
  const checked = useSyncExternalStore(subscribePrefs, getMathExpand)
  return (
    <ToggleSetting
      id="sumitex-math-expand"
      label="Math auto-expansion"
      description="In math, short triggers expand as you type: // to \frac{}{}, @a to \alpha, -> to \to. Ctrl+Z right after gives back what you typed."
      checked={checked}
      onChange={setMathExpand}
    />
  )
}

function MathRulesSetting() {
  const saved = useSyncExternalStore(subscribePrefs, getMathRules)
  const enabled = useSyncExternalStore(subscribePrefs, getMathExpand)
  const [open, setOpen] = useState(false)
  const { rules, off } = parseRules(saved)

  return (
    <>
      <ButtonSetting
        id="sumitex-math-rules"
        label="Your math shortcuts"
        description={
          saved.trim()
            ? `${rules.length} of your own, ${off.size} built-in switched off`
            : 'Add your own triggers, or switch built-in ones off.'
        }
        buttonText={open ? 'Close' : 'Edit…'}
        onClick={() => setOpen(!open)}
        disabled={!enabled}
      />
      {open && <MathRulesEditor id="sumitex-math-rules-input" />}
    </>
  )
}

export function PersonalSnippetsSetting() {
  const text = useSyncExternalStore(subscribeAccountPrefs, getPersonalSnippets)
  const { setShow } = useSettingsModalContext()
  const count = parseSnippetFile(text).presets.length

  const open = () => {
    // Settings closes first; the snippets dialog takes its place
    setShow(false)
    window.setTimeout(
      () => window.dispatchEvent(new Event(OPEN_PERSONAL_SNIPPETS_EVENT)),
      200
    )
  }

  return (
    <Setting
      controlId="sumitex-personal-snippets"
      label="Your snippets"
      description={
        <>
          {count
            ? `Used in every project · ${count} snippet${count === 1 ? '' : 's'}`
            : 'Used in every project · none yet'}
          {' · '}
          <a href="/user/settings#sx-snippets" target="_blank" rel="noreferrer">
            Also in Account settings
          </a>
        </>
      }
    >
      <OLButton
        id="sumitex-personal-snippets"
        variant="secondary"
        size="sm"
        onClick={open}
        disabled={!hasAccount}
      >
        Edit…
      </OLButton>
    </Setting>
  )
}

export default function useSumitexEditorSection(): SettingsSection {
  return {
    key: 'sumitex',
    title: 'SumiTeX',
    settings: [
      { key: 'sumitexCodeToolbar', component: <CodeToolbarSetting /> },
      { key: 'sumitexMathExpand', component: <MathExpandSetting /> },
      { key: 'sumitexMathRules', component: <MathRulesSetting /> },
      { key: 'sumitexSnippets', component: <PersonalSnippetsSetting /> },
    ],
  }
}
