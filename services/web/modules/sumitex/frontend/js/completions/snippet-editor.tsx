/**
 * A small editor for snippet text (\snippet … \endsnippet), shared by the
 * "Your snippets" dialog in the editor and the account settings page.
 *
 * - LaTeX highlighting in SumiTeX's colours, following the theme
 * - #{…} placeholders shown as pills, and each \snippet header on a band,
 *   so the snippets stand apart
 * - \snippet inserts an empty snippet; Tab moves between placeholders
 * - problems underlined as you type (snippet-file-lint.ts)
 */
import { useEffect, useRef } from 'react'
import { EditorState, RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  ViewUpdate,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import {
  HighlightStyle,
  LanguageSupport,
  syntaxHighlighting,
} from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import {
  Completion,
  CompletionContext,
  autocompletion,
  snippet,
} from '@codemirror/autocomplete'
import { LaTeXLanguage } from '@/features/source-editor/languages/latex/latex-language'
import { snippetFileLint } from './snippet-file-lint'
import { SNIPPET_SKELETON } from './snippets-with-packages'

// SumiTeX's colours, from the theme tokens, so both themes follow
const highlight = HighlightStyle.define([
  { tag: t.tagName, color: 'var(--sx-accent)' },
  { tag: t.keyword, color: 'var(--sx-accent)', fontWeight: '600' },
  { tag: t.attributeValue, color: 'var(--sx-positive)' },
  { tag: [t.literal, t.escape], color: 'var(--sx-warning)' },
  { tag: [t.string, t.number], color: 'var(--sx-positive)' },
  { tag: [t.brace, t.squareBracket], color: 'var(--sx-muted)' },
  { tag: t.comment, color: 'var(--sx-muted)', fontStyle: 'italic' },
])

// #{name} and #{} placeholders, as pills
const placeholderMark = Decoration.mark({ class: 'sx-snippet-placeholder' })
const placeholders = new MatchDecorator({
  regexp: /#\{[^}]*\}/g,
  decoration: () => placeholderMark,
})
const placeholderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = placeholders.createDeco(view)
    }

    update(update: ViewUpdate) {
      this.decorations = placeholders.updateDeco(update, this.decorations)
    }
  },
  { decorations: plugin => plugin.decorations }
)

// \snippet header lines on a band, \endsnippet lines muted
const headerLine = Decoration.line({ class: 'sx-snippet-header' })
const endLine = Decoration.line({ class: 'sx-snippet-end' })
function bands(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos)
      if (/^\s*\\snippet\b/.test(line.text)) {
        builder.add(line.from, line.from, headerLine)
      } else if (/^\s*\\endsnippet\b/.test(line.text)) {
        builder.add(line.from, line.from, endLine)
      }
      pos = line.to + 1
    }
  }
  return builder.finish()
}
const bandPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = bands(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = bands(update.view)
      }
    }
  },
  { decorations: plugin => plugin.decorations }
)

const skeletonSource = (context: CompletionContext) => {
  const word = context.matchBefore(/\\[a-zA-Z]*/)
  if (!word || (word.from === word.to && !context.explicit)) return null
  return {
    from: word.from,
    options: [
      {
        label: '\\snippet',
        detail: 'New snippet',
        type: 'snippet',
        apply: snippet(SNIPPET_SKELETON),
      },
    ],
    validFor: /^\\[a-zA-Z]*$/,
  }
}

export function SnippetEditor({
  initial,
  newSnippet = null,
  onChange,
  autoFocus = false,
  label,
}: {
  initial: string
  /** A snippet template (with #{} placeholders) to add at the end */
  newSnippet?: string | null
  onChange: (text: string) => void
  autoFocus?: boolean
  label: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const latestOnChange = useRef(onChange)
  latestOnChange.current = onChange

  // Made once per mount: give the component a new key to start over
  useEffect(() => {
    if (!host.current) return
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initial,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': label }),
          placeholder('Type \\snippet for a new snippet'),
          new LanguageSupport(LaTeXLanguage),
          syntaxHighlighting(highlight),
          placeholderPlugin,
          bandPlugin,
          autocompletion({ override: [skeletonSource] }),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          snippetFileLint(),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              latestOnChange.current(update.state.doc.toString())
            }
          }),
        ],
      }),
    })
    const end = view.state.doc.length
    if (newSnippet) {
      snippet(newSnippet)(view, { label: 'new snippet' } as Completion, end, end)
    } else if (autoFocus) {
      view.dispatch({ selection: { anchor: end }, scrollIntoView: true })
    }
    if (autoFocus || newSnippet) view.focus()
    return () => view.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div className="sx-snippet-editor" ref={host} />
}
