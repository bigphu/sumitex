/**
 * The editor for your math shortcuts (editor/math-auto-expand.ts): a text
 * box of rules, one per line, with the built-in rules listed underneath
 * (yours replacing or switching them off). Saved when the box loses focus
 * and when it closes. Used in the editor's Settings dialog and on the
 * account settings page.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { getMathRules, setMathRules } from './prefs'
import { hasAccount } from './account-prefs'
import {
  libraryEntries,
  parseRules,
  switchBuiltin,
} from '../snippets/registry'
import { EntryRow, groupOf, groupTitle } from '../completions/snippet-entry'

export function MathRulesEditor({
  id,
  showBuiltin = true,
}: {
  id: string
  /** List the built-in rules under the box (the snippet library has its own) */
  showBuiltin?: boolean
}) {
  const [draft, setDraft] = useState(getMathRules)
  const { rules, off } = parseRules(draft)

  // The built-in shortcuts, as the snippet library shows them: trigger,
  // what it is, its subject and switch; the LaTeX when a row is opened
  const builtin = useMemo(
    () =>
      libraryEntries({ rules: draft }).filter(
        ({ def }) =>
          def.source === 'builtin' && def.mode !== 'menu' && def.where !== 'text'
      ),
    [draft]
  )
  const subjectOf = (entry: (typeof builtin)[number]) =>
    entry.def.tag ?? groupTitle(groupOf(entry.def))

  // Save what's there when the editor closes, too
  const latest = useRef(draft)
  latest.current = draft
  useEffect(
    () => () => {
      if (latest.current !== getMathRules()) setMathRules(latest.current)
    },
    []
  )

  return (
    <div className="sx-math-rules">
      <p className="sx-math-rules-help">
        One per line: the trigger, a space, then what it becomes.{' '}
        <code>#{'{}'}</code> marks where the cursor goes (Tab moves to the
        next one). A trigger on its own switches a built-in one off;{' '}
        <code>%</code> starts a comment, and at the end of a rule says what
        it is (<code>@w \omega % omega</code>).{' '}
        {hasAccount ? 'Saved with your account.' : 'Saved in this browser.'}
      </p>
      <textarea
        id={id}
        className="sx-math-rules-input"
        aria-label="Your math shortcuts"
        spellCheck={false}
        rows={7}
        value={draft}
        placeholder={'@w \\omega\n.. \\cdot\nhat \\hat{#{}}#{}\nsq'}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => setMathRules(draft)}
      />
      <p className="sx-math-rules-help">
        {rules.length} rule{rules.length === 1 ? '' : 's'} of your own
        {off.size ? `, ${off.size} built-in switched off` : ''}.
        {showBuiltin && ' Built in (open one to see what it becomes):'}
      </p>
      {showBuiltin && (
        <ul className="sx-lib-list sx-math-rules-builtin">
          {builtin.map((entry, index) => {
            const subject = subjectOf(entry)
            const first = index === 0 || subjectOf(builtin[index - 1]) !== subject
            return (
              <Fragment key={entry.def.trigger}>
                {first && <li className="sx-lib-subject">{subject}</li>}
                <EntryRow
                  entry={entry}
                  onSwitch={(def, on) => {
                    // The switch writes into this box (as typing the
                    // trigger on its own would) and saves at once
                    const next = switchBuiltin(draft, def, on)
                    setDraft(next)
                    setMathRules(next)
                  }}
                />
              </Fragment>
            )
          })}
        </ul>
      )}
    </div>
  )
}
