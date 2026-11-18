/**
 * The Settings dialog, sorted by task (settingsModalTabs slot): Overleaf's
 * Editor tab is split into Typing and Display, and two tabs are added for
 * SumiTeX's features.
 *
 * - Editor: Typing (completion, brackets, floating menu) and Display (tabs,
 *   breadcrumbs, equation preview, cursor, toolbar, PDF viewer)
 * - Snippets & shortcuts: math auto-expansion, and the way into the snippet
 *   library (completions/snippet-library.tsx), which holds the snippets,
 *   the shortcuts and their editors; keybindings and the shortcut sheet
 * - Checks: the code check, missing packages, and project checks
 * - Compiler, Spelling, References, Appearance… unchanged
 *
 * Any Editor setting not placed here (one added by another module, or by a
 * later Overleaf) stays in Editor, in its own section, so nothing is lost.
 */
import { useSyncExternalStore } from 'react'
import OLButton from '@/shared/components/ol/ol-button'
import Setting from '@/features/ide-settings/components/setting'
import ToggleSetting from '@/features/ide-settings/components/toggle-setting'
import { useSettingsModalContext } from '@/features/ide-settings/context/settings-modal-context'
import { useProjectSettingsContext } from '@/features/ide-settings/context/project-settings-context'
import type {
  Setting as SettingEntry,
  SettingsEntry,
  SettingsSection,
  SettingsTab,
} from '@/features/ide-settings/context/types'
import { CodeToolbarSetting, MathExpandSetting } from './editor-settings-section'
import {
  getCheckPackages,
  getCheckProject,
  getMathRules,
  setCheckPackages,
  setCheckProject,
  subscribePrefs,
} from './prefs'
import {
  getProjectPreamble,
  subscribeProjectPreamble,
} from '../diagnostics/preamble-store'
import {
  getPersonalSnippets,
  subscribeAccountPrefs,
} from './account-prefs'
import { libraryEntries, parseRules } from '../snippets/registry'
import {
  LibraryPane,
  OPEN_SNIPPET_LIBRARY_EVENT,
} from '../completions/snippet-library'
import { SHOW_SHORTCUTS_EVENT } from '../editor/vscode-keymap'

/** Close Settings, then do something that needs the editor */
function useCloseThen() {
  const { setShow } = useSettingsModalContext()
  return (event: string, detail?: unknown) => {
    setShow(false)
    window.setTimeout(
      () => window.dispatchEvent(new CustomEvent(event, { detail })),
      200
    )
  }
}

function LibraryButton({ pane, text }: { pane: LibraryPane; text: string }) {
  const closeThen = useCloseThen()
  return (
    <OLButton
      id={`sumitex-library-${pane}`}
      variant="secondary"
      size="sm"
      onClick={() => closeThen(OPEN_SNIPPET_LIBRARY_EVENT, pane)}
    >
      {text}
    </OLButton>
  )
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function SnippetLibrarySetting() {
  const project = useSyncExternalStore(
    subscribeProjectPreamble,
    () => getProjectPreamble().snippets ?? null
  )
  const personal = useSyncExternalStore(
    subscribeAccountPrefs,
    getPersonalSnippets
  )
  const rules = useSyncExternalStore(subscribePrefs, getMathRules)
  const entries = libraryEntries({ project, personal, rules })
  const snippets = entries.filter(({ def }) => def.mode === 'menu').length
  return (
    <Setting
      controlId="sumitex-library-browse"
      label="Snippet library"
      description={`Every snippet and math shortcut, with a filter and what each inserts · ${plural(snippets, 'snippet')}, ${plural(entries.length - snippets, 'shortcut')}`}
    >
      <LibraryButton pane="browse" text="Open" />
    </Setting>
  )
}

function YourSnippetsSetting() {
  const personal = useSyncExternalStore(
    subscribeAccountPrefs,
    getPersonalSnippets
  )
  const project = useSyncExternalStore(
    subscribeProjectPreamble,
    () => getProjectPreamble().snippets ?? null
  )
  const count = libraryEntries({ personal, project }).filter(
    ({ def }) => def.source === 'personal'
  ).length
  return (
    <Setting
      controlId="sumitex-library-yours"
      label="Your snippets"
      description={`In every project you open · ${count ? plural(count, 'snippet') : 'none yet'}`}
    >
      <LibraryButton pane="yours" text="Edit…" />
    </Setting>
  )
}

function YourShortcutsSetting() {
  const rules = useSyncExternalStore(subscribePrefs, getMathRules)
  const { rules: own, off } = parseRules(rules)
  return (
    <Setting
      controlId="sumitex-library-rules"
      label="Your math shortcuts"
      description={
        own.length || off.size
          ? `${plural(own.length, 'rule')} of your own, ${off.size} built-in switched off`
          : 'Add your own triggers, or switch built-in ones off'
      }
    >
      <LibraryButton pane="rules" text="Edit…" />
    </Setting>
  )
}

function ShortcutSheetSetting() {
  const closeThen = useCloseThen()
  return (
    <Setting
      controlId="sumitex-shortcut-sheet"
      label="Keyboard shortcuts"
      description="Every key in one place, with a filter (Ctrl+K Ctrl+S)."
    >
      <OLButton
        id="sumitex-shortcut-sheet"
        variant="secondary"
        size="sm"
        onClick={() => closeThen(SHOW_SHORTCUTS_EVENT)}
      >
        Open
      </OLButton>
    </Setting>
  )
}

// Both run through the editor's code check, and only while it is on
function CheckPackagesSetting() {
  const checked = useSyncExternalStore(subscribePrefs, getCheckPackages)
  const { syntaxValidation: codeCheck } = useProjectSettingsContext()
  return (
    <ToggleSetting
      id="sumitex-check-packages"
      label="Missing packages"
      description={
        codeCheck
          ? "Underline commands whose package isn't loaded, with a fix to add it (Ctrl+.)."
          : 'Needs Code check, above.'
      }
      disabled={!codeCheck}
      checked={checked}
      onChange={setCheckPackages}
    />
  )
}

function CheckProjectSetting() {
  const checked = useSyncExternalStore(subscribePrefs, getCheckProject)
  const { syntaxValidation: codeCheck } = useProjectSettingsContext()
  return (
    <ToggleSetting
      id="sumitex-check-project"
      label="Project checks"
      description={
        codeCheck
          ? "Undefined references, duplicate labels, citations missing from the .bib, missing images and files."
          : 'Needs Code check, above.'
      }
      disabled={!codeCheck}
      checked={checked}
      onChange={setCheckProject}
    />
  )
}

const own = (key: string, component: JSX.Element): SettingEntry => ({
  key,
  component,
})

export default function sumitexSettingsTabs(
  tabs: SettingsEntry[]
): SettingsEntry[] {
  const editor = tabs.find(
    (tab): tab is SettingsTab => tab.key === 'editor' && 'sections' in tab
  )
  if (!editor) return tabs

  // Overleaf's Editor settings by key, to place them by task
  const stock = new Map<string, SettingEntry>()
  for (const section of editor.sections) {
    for (const setting of section.settings) stock.set(setting.key, setting)
  }
  const used = new Set<string>()
  const take = (...keys: string[]) =>
    keys.flatMap(key => {
      const setting = stock.get(key)
      if (!setting) return []
      used.add(key)
      return [setting]
    })

  const typing: SettingsSection = {
    key: 'sx-typing',
    title: 'Typing',
    settings: take('autoComplete', 'autoPairDelimiters', 'floating-menu'),
  }
  const display: SettingsSection = {
    key: 'sx-display',
    title: 'Display',
    settings: [
      ...take(
        'editorTabs',
        'previewTabs',
        'breadcrumbs-setting',
        'mathPreview',
        'nonBlinkingCursor'
      ),
      own('sumitexCodeToolbar', <CodeToolbarSetting />),
      ...take('pdfViewer'),
    ],
  }
  const keys = take('mode')
  const codeCheck = take('syntaxValidation')

  // What's left, in its own sections (SumiTeX's old section included, so
  // it isn't listed twice)
  const rest = editor.sections
    .filter(section => section.key !== 'sumitex')
    .map(section => ({
      ...section,
      settings: section.settings.filter(setting => !used.has(setting.key)),
    }))
    .filter(section => section.settings.length > 0)

  const snippets: SettingsTab = {
    key: 'sumitex-snippets',
    title: 'Snippets & shortcuts',
    icon: 'text_snippet',
    sections: [
      {
        key: 'sx-snippets',
        title: 'Snippets & shortcuts',
        settings: [
          own('sumitexSnippetLibrary', <SnippetLibrarySetting />),
          own('sumitexSnippets', <YourSnippetsSetting />),
          own('sumitexMathExpand', <MathExpandSetting />),
          own('sumitexMathRules', <YourShortcutsSetting />),
        ],
      },
      {
        key: 'sx-keys',
        title: 'Keys',
        settings: [...keys, own('sumitexShortcutSheet', <ShortcutSheetSetting />)],
      },
    ],
  }

  const checks: SettingsTab = {
    key: 'sumitex-checks',
    title: 'Checks',
    icon: 'check_circle',
    sections: [
      {
        key: 'sx-live-checks',
        title: 'While you type',
        settings: [
          ...codeCheck,
          own('sumitexCheckPackages', <CheckPackagesSetting />),
          own('sumitexCheckProject', <CheckProjectSetting />),
        ],
      },
    ],
  }

  const newEditor: SettingsTab = {
    ...editor,
    sections: [typing, display, ...rest].filter(
      section => section.settings.length > 0
    ),
  }

  return tabs.flatMap(tab =>
    tab === editor ? [newEditor, snippets, checks] : [tab]
  )
}
