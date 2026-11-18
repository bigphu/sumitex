/**
 * Snippets of a project's own, from its .sxs files (snippets.sxs), shared
 * with collaborators and kept in history like any other file. The format
 * is the one SumiTeX's built-in snippets use: snippets/format.ts. A
 * project snippet replaces a built-in one with the same trigger.
 */
import {
  parseSnippets,
  type SnippetDef,
  type FormatProblem,
} from '../snippets/format'

export type SnippetFileProblem = FormatProblem

/** A snippet file's snippets, the line of each header, and its problems */
export function parseSnippetFile(text: string): {
  presets: SnippetDef[]
  lines: number[]
  problems: SnippetFileProblem[]
} {
  const { defs, problems } = parseSnippets(text, 'project')
  return { presets: defs, lines: defs.map(def => def.line), problems }
}

/** The project's snippets */
export const projectPresets = (text: string | null): SnippetDef[] =>
  text ? parseSnippets(text, 'project').defs : []
