/**
 * The editor for your math shortcuts (editor/math-auto-expand.ts): a text
 * box of rules, one per line, with the built-in rules listed underneath
 * (yours replacing or switching them off). Saved when the box loses focus
 * and when it closes. Used in the editor's Settings dialog and on the
 * account settings page.
 */
import { useEffect, useRef, useState } from 'react'
import { getMathRules, setMathRules } from './prefs'
import { hasAccount } from './account-prefs'
import { BUILT_IN_RULES, parseRules } from '../editor/math-auto-expand'

const shown = (replacement: string) => replacement.replace(/#\{\}/g, '▮')

export function MathRulesEditor({ id }: { id: string }) {
  const [draft, setDraft] = useState(getMathRules)
  const { rules, off } = parseRules(draft)

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
        <code>%</code> starts a comment.{' '}
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
        {off.size ? `, ${off.size} built-in switched off` : ''}. Built in:
      </p>
      <ul className="sx-math-rules-builtin">
        {BUILT_IN_RULES.map(rule => {
          const replaced = rules.some(own => own.trigger === rule.trigger)
          return (
            <li
              key={rule.trigger}
              className={
                off.has(rule.trigger) || replaced ? 'sx-off' : undefined
              }
              title={
                off.has(rule.trigger)
                  ? 'Switched off'
                  : replaced
                    ? 'Replaced by yours'
                    : undefined
              }
            >
              <code>{rule.trigger}</code> {shown(rule.replacement)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
