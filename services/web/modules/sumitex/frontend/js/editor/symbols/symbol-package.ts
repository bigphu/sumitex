/**
 * Loading the package a symbol needs (amssymb), as snippets do: in a file
 * with its own preamble, in the same change as the symbol (one undo takes
 * back both); in a chapter, the main file's job, done when asked.
 */
import type { ChangeSpec } from '@codemirror/state'
import { preambleOf, stripComments } from '../../diagnostics/preamble'
import { getProjectPreamble, wasJustAdded } from '../../diagnostics/preamble-store'
import { packageInsertion } from '../add-package'

export const hasOwnPreamble = (text: string) =>
  /\\documentclass/.test(stripComments(preambleOf(text)))

/**
 * What loading `name` takes: a change in this file, 'main' when the main
 * file still needs it, or null when it is loaded already
 */
export function packageNeeded(text: string, name: string): ChangeSpec | 'main' | null {
  if (hasOwnPreamble(text)) return packageInsertion(text, name)
  if (wasJustAdded(name) || getProjectPreamble().preamble?.loaded.has(name)) return null
  return 'main'
}
