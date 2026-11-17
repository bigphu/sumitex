import { EditorView } from '@codemirror/view'
import { latexLinter } from './linter/latex-linter'
import { lintSourceConfig } from '../../extensions/annotations'
import { createLinter } from '../../extensions/linting'

// SumiTeX: project snippet files (.sxs) hold fragments, not a document, so
// the syntax check would flag every math snippet; they end snippets with
// \endsnippet lines, which no LaTeX file has
const isSnippetFile = (view: EditorView) =>
  /^[ \t]*\\endsnippet\b/m.test(view.state.doc.toString())

export const linting = () =>
  createLinter(
    view => (isSnippetFile(view) ? [] : latexLinter(view)), // SumiTeX
    lintSourceConfig
  )
