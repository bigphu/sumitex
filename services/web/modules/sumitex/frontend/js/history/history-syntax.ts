/**
 * Syntax colours in the history view. Overleaf's viewer
 * (features/history/components/diff-view/document-diff-viewer.tsx) shows a
 * version as plain text; this gives it the file's language and the editor's
 * colour theme, so a version reads like the file in the editor.
 *
 * Only the grammars are loaded: the editor's language packages also bring a
 * linter, completions and the like, which a read-only old version doesn't
 * need. Problems aren't marked either: they belong to the current version.
 */
import { Compartment, Extension, TransactionSpec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  LanguageDescription,
  LanguageSupport,
  syntaxHighlighting,
} from '@codemirror/language'
import { classHighlighter } from '@/features/source-editor/extensions/class-highlighter'
import { languages } from '@/features/source-editor/languages'
import { LaTeXLanguage } from '@/features/source-editor/languages/latex/latex-language'
import { BibTeXLanguage } from '@/features/source-editor/languages/bibtex/bibtex-language'
import getMeta from '@/utils/meta'

const languageConf = new Compartment()
const themeConf = new Compartment()

/** For the viewer's extensions: empty until historySyntaxSpec resolves */
export const historySyntax = (): Extension => [
  languageConf.of([]),
  syntaxHighlighting(classHighlighter),
  themeConf.of([]),
]

async function loadLanguage(pathname: string): Promise<Extension> {
  const description = LanguageDescription.matchFilename(languages, pathname)
  if (!description) return []
  switch (description.name) {
    case 'latex':
      return new LanguageSupport(LaTeXLanguage)
    case 'bibtex':
      return new LanguageSupport(BibTeXLanguage)
    default:
      // Markdown and Python: their small packages whole (Markdown's key
      // bindings do nothing in a read-only view)
      return description.load()
  }
}

// The editor's colour theme, as source-editor/extensions/theme.ts loads it
async function loadTheme(name: string): Promise<Extension> {
  const known = [
    ...(getMeta('ol-editorThemes') || []),
    ...(getMeta('ol-legacyEditorThemes') || []),
  ].some(theme => theme.name === name)
  const { highlightStyle, dark } = await import(
    /* webpackChunkName: "cm6-theme" */ `../../../../../frontend/js/features/source-editor/themes/cm6/${known ? name : 'textmate'}.json`
  )
  // eslint-disable-next-line @overleaf/no-generated-editor-themes
  return EditorView.theme(highlightStyle, { dark })
}

/** The language for this file and the colours of this editor theme */
export async function historySyntaxSpec(
  pathname: string | undefined,
  editorTheme: string
): Promise<TransactionSpec> {
  const [language, theme] = await Promise.all([
    pathname ? loadLanguage(pathname).catch(() => []) : [],
    loadTheme(editorTheme).catch(() => []),
  ])
  return {
    effects: [languageConf.reconfigure(language), themeConf.reconfigure(theme)],
  }
}
