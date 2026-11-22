/**
 * One row of the snippet library (snippet-library.tsx), also used for the
 * built-in math shortcuts in Settings (settings/math-rules-editor.tsx).
 *
 * A math shortcut (anything that expands as you type or on Tab) reads as
 * what you need to know first: its trigger, what it is ("Fraction"), its
 * subject ("Structure") and its switch. What it turns into, the LaTeX,
 * shows when the row is opened. A menu snippet keeps its label (with
 * where and how it's offered) and opens the same way.
 *
 * Descriptions and subjects come from the snippet text (snippets/format.ts):
 * a comment ending a shortcut's line, and the comment heading above it.
 */
import { useState } from 'react'
import classNames from 'classnames'
import { getMathRules, setMathRules } from '../settings/prefs'
import {
  LibraryEntry,
  sampleValues,
  switchBuiltin,
} from '../snippets/registry'
import { shownTrigger, SnippetDef } from '../snippets/format'
import { renderBody, renderLabel } from '../snippets/render'

export const GROUP_TITLES: Record<string, string> = {
  personal: 'Your snippets',
  project: 'This project',
  rules: 'Your math shortcuts',
  shortcuts: 'Math shortcuts',
}

export const groupOf = (def: SnippetDef) =>
  def.source === 'builtin' ? (def.group ?? 'builtin') : def.source

export const groupTitle = (group: string) =>
  GROUP_TITLES[group] ??
  group.charAt(0).toUpperCase() + group.slice(1).replace(/-/g, ' ')

// What it becomes, readable: an empty placeholder as ▮, a named one by name
const readable = (body: string) =>
  body.replace(/#\{([^}]*)\}/g, (_, name: string) => name || '▮')

const MODE_NAMES = { menu: 'menu', auto: 'as you type', tab: 'on Tab' }
const WHERE_NAMES = { text: 'text', math: 'math', any: 'anywhere' }

/** The trigger with example values: \table3x3 */
const exampleTrigger = (def: SnippetDef) => {
  const values = sampleValues(def)
  return def.trigger.replace(
    /#\{([a-z][a-z0-9]*):[^}]*\}/g,
    (_, name: string) => values[name]
  )
}

export function EntryRow({
  entry,
  onSwitch,
}: {
  entry: LibraryEntry
  /** Where the switch writes (default: your saved math shortcuts) */
  onSwitch?: (def: SnippetDef, on: boolean) => void
}) {
  const { def, state } = entry
  const [open, setOpen] = useState(false)
  const switchable = def.source === 'builtin' && def.mode !== 'menu'
  const shortcut = def.mode !== 'menu'
  const values = sampleValues(def)
  const label = shortcut
    ? (def.description ??
      (def.pattern
        ? renderLabel(def, values)
        : readable(renderBody(def, values))))
    : renderLabel(def, values)
  const tags = shortcut
    ? [
        def.tag ?? groupTitle(groupOf(def)),
        ...(def.mode === 'tab' ? [MODE_NAMES.tab] : []),
        ...(def.where === 'text' ? ['in text'] : []),
      ]
    : [WHERE_NAMES[def.where], MODE_NAMES[def.mode]]

  return (
    <li className={classNames('sx-lib-entry', `sx-lib-${state}`, { open })}>
      <div className="sx-lib-row">
        <button
          type="button"
          className="sx-lib-main"
          aria-expanded={open}
          title={open ? undefined : 'Show what it becomes'}
          onClick={() => setOpen(!open)}
        >
          <code className="sx-lib-trigger">{shownTrigger(def.trigger)}</code>
          <span className={classNames('sx-lib-label', { 'sx-lib-label-code': shortcut && !def.description })}>
            {label}
          </span>
          <span className="sx-lib-tags">
            {tags.map(tag => (
              <span key={tag}>{tag}</span>
            ))}
            {state === 'replaced' && <span>replaced</span>}
            {state === 'off' && <span>off</span>}
          </span>
        </button>
        {switchable && (
          <div className="form-check form-switch sx-lib-switch">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              aria-label={`${def.description ?? def.trigger} on`}
              checked={state !== 'off'}
              onChange={event =>
                onSwitch
                  ? onSwitch(def, event.target.checked)
                  : setMathRules(
                      switchBuiltin(getMathRules(), def, event.target.checked)
                    )
              }
            />
          </div>
        )}
      </div>
      {open && (
        <div className="sx-lib-detail">
          {def.captures.length > 0 && (
            <p>
              Type <code>{exampleTrigger(def)}</code>
              {def.captures.map(capture => (
                <span key={capture.name}>
                  {' · '}
                  <code>{capture.name}</code>{' '}
                  {capture.kind === 'letter'
                    ? 'a letter'
                    : `${capture.min} to ${capture.max}`}
                </span>
              ))}
            </p>
          )}
          {shortcut && <p className="sx-lib-becomes">Becomes</p>}
          <pre className="sx-lib-body">{readable(renderBody(def, values))}</pre>
          {(def.packages.length > 0 || def.preamble.length > 0) && (
            <p>
              Adds{' '}
              {[
                ...def.packages.map(name => `\\usepackage{${name}}`),
                ...def.preamble,
              ].map(line => (
                <code key={line}>{line} </code>
              ))}
              to the preamble when missing.
            </p>
          )}
        </div>
      )}
    </li>
  )
}
