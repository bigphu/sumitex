/**
 * Your personal snippets: the same \snippet … \endsnippet text as a
 * project's .sxs file, kept with your account (settings/account-prefs.ts)
 * and offered in every project you open. A project's own snippet with the
 * same trigger wins over yours, and yours over a built-in one.
 *
 * Edited here in a dialog (palette: "Snippets: Open your snippets"), or on
 * the account settings page (settings/account-section.tsx).
 */
import { useState } from 'react'
import {
  OLModal,
  OLModalBody,
  OLModalFooter,
  OLModalHeader,
  OLModalTitle,
} from '@/shared/components/ol/ol-modal'
import OLButton from '@/shared/components/ol/ol-button'
import {
  getPersonalSnippets,
  hasAccount,
  savePersonalSnippets,
} from '../settings/account-prefs'
import { parseSnippetFile } from './project-snippets'
import { SnippetEditor } from './snippet-editor'

/** Opens the dialog from elsewhere (Settings → SumiTeX → Your snippets) */
export const OPEN_PERSONAL_SNIPPETS_EVENT = 'sumitex:open-personal-snippets'

export const PERSONAL_STARTER = String.raw`% Your snippets, offered in every project you open.
% Type a trigger in any .tex file and pick it from the menu.
%
%   \snippet{\trigger}{Label shown in the menu}[packages,it,needs]
%   ...the text, inserted as written. #{name} is a placeholder that Tab
%   moves to, #{} an empty one.
%   \endsnippet
%
% \snippet[math]{...} is offered only inside math. Type \snippet below for
% an empty one. A project's own snippet with the same trigger wins.
`

/** "3 snippets · 1 problem" */
export function snippetSummary(text: string) {
  const { presets, problems } = parseSnippetFile(text)
  const count = `${presets.length} snippet${presets.length === 1 ? '' : 's'}`
  return problems.length
    ? `${count} · ${problems.length} problem${problems.length === 1 ? '' : 's'}, underlined`
    : count
}

function DialogBody({
  newSnippet,
  onHide,
}: {
  newSnippet: string | null
  onHide: () => void
}) {
  const [initial] = useState(() => getPersonalSnippets() || PERSONAL_STARTER)
  const [text, setText] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'failed'>('idle')

  const save = async () => {
    setStatus('saving')
    if (await savePersonalSnippets(text)) onHide()
    else setStatus('failed')
  }

  return (
    <>
      <OLModalBody>
        <p className="sx-snippets-help">
          Offered in every project you open, saved with your account (also
          under Account settings). A project&apos;s <code>snippets.sxs</code>{' '}
          wins when a trigger is the same.
        </p>
        <SnippetEditor
          initial={initial}
          newSnippet={newSnippet}
          onChange={setText}
          autoFocus
          label="Your snippets"
        />
      </OLModalBody>
      <OLModalFooter>
        <span className="sx-snippets-status">
          {status === 'failed'
            ? 'Could not save. Check your connection and try again.'
            : snippetSummary(text)}
        </span>
        <OLButton variant="secondary" onClick={onHide}>
          Cancel
        </OLButton>
        <OLButton
          variant="primary"
          onClick={save}
          disabled={!hasAccount || status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </OLButton>
      </OLModalFooter>
    </>
  )
}

export function PersonalSnippetsDialog({
  show,
  onHide,
  newSnippet,
}: {
  show: boolean
  onHide: () => void
  /** A snippet template (with #{} placeholders) to add at the end */
  newSnippet: string | null
}) {
  return (
    <OLModal
      show={show}
      onHide={onHide}
      size="lg"
      id="sx-personal-snippets"
      themed
    >
      <OLModalHeader closeButton>
        <OLModalTitle>Your snippets</OLModalTitle>
      </OLModalHeader>
      {show && <DialogBody newSnippet={newSnippet} onHide={onHide} />}
    </OLModal>
  )
}
