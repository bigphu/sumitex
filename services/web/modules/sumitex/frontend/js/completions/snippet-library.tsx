/**
 * The snippet library: every snippet and math shortcut in one dialog,
 * moved out of Settings so each part has room.
 *
 * - Browse: all of them (built-in by subject, the project's, yours), with
 *   a filter; a row opens to show what it inserts. Built-in shortcuts have
 *   a switch, which writes the trigger into your math shortcuts (the same
 *   as typing it there on its own).
 * - Your snippets: the editor from personal-snippets.tsx, saved with your
 *   account.
 * - Your math shortcuts: the rules box (settings/math-rules-editor.tsx).
 * - Project snippets: opens the project's snippets.sxs.
 *
 * Opened from Settings → Snippets & shortcuts, the palette ("Snippets:
 * Open snippet library", "Snippets: Open your snippets"), or an event.
 */
import { useMemo, useState, useSyncExternalStore } from 'react'
import classNames from 'classnames'
import {
  OLModal,
  OLModalBody,
  OLModalHeader,
  OLModalTitle,
} from '@/shared/components/ol/ol-modal'
import OLButton from '@/shared/components/ol/ol-button'
import MaterialIcon from '@/shared/components/material-icon'
import {
  getPersonalSnippets,
  hasAccount,
  savePersonalSnippets,
  subscribeAccountPrefs,
} from '../settings/account-prefs'
import { getMathRules, setMathRules, subscribePrefs } from '../settings/prefs'
import {
  getProjectPreamble,
  subscribeProjectPreamble,
} from '../diagnostics/preamble-store'
import { MathRulesEditor } from '../settings/math-rules-editor'
import { LibraryEntry, libraryEntries } from '../snippets/registry'
import { SnippetDef } from '../snippets/format'
import { EntryRow, groupOf, groupTitle } from './snippet-entry'
import { SnippetEditor } from './snippet-editor'
import { PERSONAL_STARTER, snippetSummary } from './personal-snippets'
import { OPEN_PROJECT_SNIPPETS_EVENT } from './snippet-file'

/** Opens the library; detail: the pane ('browse', 'yours' or 'rules') */
export const OPEN_SNIPPET_LIBRARY_EVENT = 'sumitex:open-snippet-library'

export type LibraryPane = 'browse' | 'yours' | 'rules'

function YourSnippetsPane({
  newSnippet,
  onDirty,
}: {
  newSnippet: string | null
  onDirty: (dirty: boolean) => void
}) {
  const [initial] = useState(() => getPersonalSnippets() || PERSONAL_STARTER)
  const [text, setText] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'failed' | 'saved'>(
    'idle'
  )
  const dirty = text !== saved

  const save = async () => {
    setStatus('saving')
    if (await savePersonalSnippets(text)) {
      setSaved(text)
      setStatus('saved')
      onDirty(false)
    } else setStatus('failed')
  }

  return (
    <div className="sx-lib-pane sx-lib-yours">
      <p className="sx-snippets-help">
        Offered in every project you open, saved with your account. A
        project&apos;s <code>snippets.sxs</code> wins when a trigger is the
        same.
      </p>
      <SnippetEditor
        initial={initial}
        newSnippet={newSnippet}
        onChange={value => {
          setText(value)
          onDirty(value !== saved)
          if (status !== 'saving') setStatus('idle')
        }}
        autoFocus
        label="Your snippets"
      />
      <div className="sx-lib-actions">
        <span className="sx-snippets-status">
          {status === 'failed'
            ? 'Could not save. Check your connection and try again.'
            : `${snippetSummary(text)}${dirty ? ' · not saved' : status === 'saved' ? ' · saved' : ''}`}
        </span>
        <OLButton
          variant="primary"
          size="sm"
          onClick={save}
          disabled={!hasAccount || !dirty || status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </OLButton>
      </div>
    </div>
  )
}

function LibraryBody({
  initialPane,
  newSnippet,
  onHide,
}: {
  initialPane: LibraryPane
  newSnippet: string | null
  onHide: () => void
}) {
  const [pane, setPane] = useState<LibraryPane>(initialPane)
  const [group, setGroup] = useState('all')
  const [filter, setFilter] = useState('')
  const [dirty, setDirty] = useState(false)

  const project = useSyncExternalStore(
    subscribeProjectPreamble,
    () => getProjectPreamble().snippets ?? null
  )
  const personal = useSyncExternalStore(
    subscribeAccountPrefs,
    getPersonalSnippets
  )
  const rules = useSyncExternalStore(subscribePrefs, getMathRules)

  const entries = useMemo(
    () => libraryEntries({ project, personal, rules }),
    [project, personal, rules]
  )
  const groups = useMemo(() => {
    const counts = new Map<string, number>()
    for (const { def } of entries) {
      counts.set(groupOf(def), (counts.get(groupOf(def)) ?? 0) + 1)
    }
    return [...counts]
  }, [entries])

  const needle = filter.trim().toLowerCase()
  const shown = entries.filter(
    ({ def }) =>
      (needle || group === 'all' || groupOf(def) === group) &&
      (!needle ||
        [def.trigger, def.label, def.body, def.description, def.tag].some(
          text => text?.toLowerCase().includes(needle)
        ))
  )
  const byGroup = new Map<string, LibraryEntry[]>()
  for (const entry of shown) {
    const key = groupOf(entry.def)
    byGroup.set(key, [...(byGroup.get(key) ?? []), entry])
  }

  const browse = (key: string) => {
    setPane('browse')
    setGroup(key)
    setFilter('')
  }

  return (
    <div className="sx-sheet sx-lib">
      <nav className="sx-sheet-index" aria-label="Snippet library">
        <label className="sx-sheet-filter">
          <MaterialIcon type="search" />
          <input
            type="search"
            placeholder="Find a snippet or shortcut"
            value={filter}
            onChange={event => {
              setFilter(event.target.value)
              setPane('browse')
            }}
            autoFocus={initialPane === 'browse'}
          />
        </label>
        <div className="sx-lib-index-title">Browse</div>
        <ul>
          <li>
            <button
              type="button"
              className={classNames({
                active: pane === 'browse' && group === 'all' && !needle,
              })}
              onClick={() => browse('all')}
            >
              <span>All</span>
              <span className="sx-sheet-count">{entries.length}</span>
            </button>
          </li>
          {groups.map(([key, count]) => (
            <li key={key}>
              <button
                type="button"
                className={classNames({
                  active: pane === 'browse' && group === key && !needle,
                })}
                onClick={() => browse(key)}
              >
                <span>{groupTitle(key)}</span>
                <span className="sx-sheet-count">{count}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="sx-lib-index-title">Yours</div>
        <ul>
          <li>
            <button
              type="button"
              className={classNames({ active: pane === 'yours' })}
              onClick={() => {
                setPane('yours')
                setFilter('')
              }}
            >
              <span>Edit snippets{dirty ? ' •' : ''}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={classNames({ active: pane === 'rules' })}
              onClick={() => {
                setPane('rules')
                setFilter('')
              }}
            >
              <span>Edit math shortcuts</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onHide()
                window.setTimeout(
                  () =>
                    window.dispatchEvent(
                      new Event(OPEN_PROJECT_SNIPPETS_EVENT)
                    ),
                  200
                )
              }}
            >
              <span>Project file</span>
              <MaterialIcon type="open_in_new" className="sx-sheet-count" />
            </button>
          </li>
        </ul>
      </nav>

      {pane === 'browse' && (
        <div className="sx-sheet-list sx-lib-list">
          {shown.length === 0 && (
            <p className="sx-sheet-empty">Nothing matches “{filter}”.</p>
          )}
          {[...byGroup].map(([key, list]) => (
            <section key={key} className="sx-lib-group">
              <h3>{groupTitle(key)}</h3>
              <ul>
                {list.map(entry => (
                  <EntryRow
                    key={`${entry.def.source}:${entry.def.line}:${entry.def.trigger}`}
                    entry={entry}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {/* Kept mounted, so an unsaved edit survives looking elsewhere */}
      <div hidden={pane !== 'yours'} className="sx-lib-pane-wrap">
        <YourSnippetsPane newSnippet={newSnippet} onDirty={setDirty} />
      </div>
      {pane === 'rules' && (
        <div className="sx-lib-pane sx-lib-rules">
          <MathRulesEditor id="sx-lib-rules-input" showBuiltin={false} />
          <p className="sx-snippets-help">
            The built-in ones are under{' '}
            <button
              type="button"
              className="btn-link sx-lib-link"
              onClick={() => browse('shortcuts')}
            >
              Browse → Math shortcuts
            </button>
            , each with a switch.
          </p>
        </div>
      )}
    </div>
  )
}

export function SnippetLibraryDialog({
  show,
  pane,
  newSnippet,
  onHide,
}: {
  show: boolean
  pane: LibraryPane
  /** A snippet template to add at the end of yours */
  newSnippet: string | null
  onHide: () => void
}) {
  return (
    <OLModal
      show={show}
      onHide={onHide}
      size="lg"
      className="sx-shortcut-sheet sx-snippet-library"
      id="sx-personal-snippets"
      themed
    >
      <OLModalHeader closeButton>
        <OLModalTitle>Snippets &amp; shortcuts</OLModalTitle>
        <p className="sx-sheet-sub">
          Type a snippet&apos;s trigger in the editor and pick it from the menu;
          shortcuts expand as you type in math
        </p>
      </OLModalHeader>
      <OLModalBody>
        {show && (
          <LibraryBody
            initialPane={pane}
            newSnippet={newSnippet}
            onHide={onHide}
          />
        )}
      </OLModalBody>
    </OLModal>
  )
}
