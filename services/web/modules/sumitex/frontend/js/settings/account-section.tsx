/**
 * "Snippets and math shortcuts" on the account settings page
 * (settingsPageSections slot): your personal snippets and math shortcuts,
 * kept with your account and used in every project, edited here without
 * opening one.
 */
import { useState, useSyncExternalStore } from 'react'
import OLButton from '@/shared/components/ol/ol-button'
import OLFormSwitch from '@/shared/components/ol/ol-form-switch'
import {
  getPersonalSnippets,
  savePersonalSnippets,
  subscribeAccountPrefs,
} from './account-prefs'
import { getMathExpand, setMathExpand, subscribePrefs } from './prefs'
import { MathRulesEditor } from './math-rules-editor'
import { SnippetEditor } from '../completions/snippet-editor'
import {
  PERSONAL_STARTER,
  snippetSummary,
} from '../completions/personal-snippets'

function PersonalSnippets() {
  const saved = useSyncExternalStore(subscribeAccountPrefs, getPersonalSnippets)
  const [initial] = useState(() => saved || PERSONAL_STARTER)
  const [text, setText] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>(
    'idle'
  )
  const dirty = text !== (saved || PERSONAL_STARTER)

  const save = async () => {
    setStatus('saving')
    setStatus((await savePersonalSnippets(text)) ? 'saved' : 'failed')
  }

  return (
    <div className="sx-account-block" id="sx-snippets">
      <div className="sx-account-block-head">
        <h4>Your snippets</h4>
        <p>
          Type a trigger in any project and pick it from the menu. Written
          like a project&apos;s <code>snippets.sxs</code>, which wins when a
          trigger is the same.
        </p>
      </div>
      <SnippetEditor
        initial={initial}
        onChange={next => {
          setText(next)
          setStatus('idle')
        }}
        label="Your snippets"
      />
      <div className="sx-account-block-foot">
        <span className="sx-snippets-status" role="status">
          {status === 'failed'
            ? 'Could not save. Check your connection and try again.'
            : status === 'saved' && !dirty
              ? `Saved · ${snippetSummary(text)}`
              : snippetSummary(text)}
        </span>
        <OLButton
          variant="primary"
          size="sm"
          onClick={save}
          disabled={!dirty || status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Save snippets'}
        </OLButton>
      </div>
    </div>
  )
}

function MathShortcuts() {
  const enabled = useSyncExternalStore(subscribePrefs, getMathExpand)
  return (
    <div className="sx-account-block" id="sx-math-shortcuts">
      <div className="sx-account-block-head sx-account-block-head-row">
        <div>
          <h4>Math shortcuts</h4>
          <p>
            In math, triggers expand as you type: <code>//</code> to{' '}
            <code>\frac{'{}{}'}</code>, <code>@a</code> to <code>\alpha</code>.
            Ctrl+Z right after gives back what you typed.
          </p>
        </div>
        <div className="sx-account-switch">
          <label htmlFor="sx-math-expand-switch">
            {enabled ? 'On' : 'Off'} in this browser
          </label>
          <OLFormSwitch
            id="sx-math-expand-switch"
            label="Math shortcuts in this browser"
            checked={enabled}
            onChange={() => setMathExpand(!enabled)}
          />
        </div>
      </div>
      <MathRulesEditor id="sx-math-rules-account" />
    </div>
  )
}

export default function SumitexAccountSection() {
  return (
    <>
      <section className="sx-account-section" aria-labelledby="sx-account-h">
        <h3 id="sx-account-h">Snippets and math shortcuts</h3>
        <p className="sx-account-intro">
          Yours in every project, saved with your account.
        </p>
        <PersonalSnippets />
        <MathShortcuts />
      </section>
      <hr />
    </>
  )
}
