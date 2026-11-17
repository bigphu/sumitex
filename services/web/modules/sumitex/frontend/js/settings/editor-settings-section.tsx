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
import type { SettingsSection } from '@/features/ide-settings/context/types'
import {
  getCodeToolbar,
  getMathExpand,
  getMathRules,
  setCodeToolbar,
  setMathExpand,
  setMathRules,
  subscribePrefs,
} from './prefs'
import { BUILT_IN_RULES, parseRules } from '../editor/math-auto-expand'

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

function MathExpandSetting() {
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

const shown = (replacement: string) => replacement.replace(/#\{\}/g, '▮')

function MathRulesSetting() {
  const saved = useSyncExternalStore(subscribePrefs, getMathRules)
  const enabled = useSyncExternalStore(subscribePrefs, getMathExpand)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(saved)
  const { rules, off } = parseRules(draft)

  const toggle = () => {
    if (open) setMathRules(draft)
    else setDraft(getMathRules())
    setOpen(!open)
  }

  return (
    <>
      <ButtonSetting
        id="sumitex-math-rules"
        label="Your math shortcuts"
        description={
          saved.trim()
            ? `${parseRules(saved).rules.length} of your own, ${parseRules(saved).off.size} built-in switched off`
            : 'Add your own triggers, or switch built-in ones off.'
        }
        buttonText={open ? 'Close' : 'Edit…'}
        onClick={toggle}
        disabled={!enabled}
      />
      {open && (
        <div className="sx-math-rules">
          <p className="sx-math-rules-help">
            One per line: the trigger, a space, then what it becomes.{' '}
            <code>#{'{}'}</code> marks where the cursor goes (Tab moves to the
            next one). A trigger on its own switches a built-in one off;{' '}
            <code>%</code> starts a comment. Saved in this browser.
          </p>
          <textarea
            className="sx-math-rules-input"
            aria-label="Your math shortcuts"
            spellCheck={false}
            rows={8}
            value={draft}
            placeholder={'@w \\omega\n.. \\cdot\nhat \\hat{#{}}#{}\nsq'}
            onChange={event => setDraft(event.target.value)}
            onBlur={() => setMathRules(draft)}
          />
          <p className="sx-math-rules-help">
            {rules.length} rule{rules.length === 1 ? '' : 's'} of your own
            {off.size ? `, ${off.size} built-in switched off` : ''}. Built in:
          </p>
          <ul className="sx-math-rules-builtin">
            {BUILT_IN_RULES.map(rule => (
              <li
                key={rule.trigger}
                className={off.has(rule.trigger) ? 'sx-off' : undefined}
              >
                <code>{rule.trigger}</code> {shown(rule.replacement)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
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
    ],
  }
}
