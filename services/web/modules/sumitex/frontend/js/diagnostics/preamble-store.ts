/**
 * The project's main preamble, shared with the linter (a CodeMirror
 * extension, outside React). The bridge fills it from the project snapshot
 * (diagnostics/use-project-preamble.ts) and the linter reads it, so a
 * chapter file is checked against the packages main.tex loads.
 *
 * Packages added from SumiTeX's own fixes count as loaded at once, before
 * the snapshot catches up, so the underline goes as soon as you click.
 */
import type { Preamble } from './preamble'

type State = {
  /** null until the main file has been read */
  preamble: Preamble | null
  /** The main file's name, for messages ("goes into main.tex") */
  mainName: string | null
  /** The main file's project path, to recognise it when it is open */
  mainPath: string | null
  /** The project's own .cls and .sty files, by base name */
  projectFiles: Map<string, string>
}

let state: State = {
  preamble: null,
  mainName: null,
  mainPath: null,
  projectFiles: new Map(),
}
const justAdded = new Set<string>()
const listeners = new Set<() => void>()

export const getProjectPreamble = () => state

export function setProjectPreamble(next: State) {
  state = next
  // Forget the packages the snapshot now shows
  for (const name of [...justAdded]) {
    if (next.preamble?.loaded.has(name)) justAdded.delete(name)
  }
  listeners.forEach(listener => listener())
}

/** A package SumiTeX just added, counted as loaded until the next read */
export function markPackageAdded(name: string) {
  justAdded.add(name)
  listeners.forEach(listener => listener())
}

export const wasJustAdded = (name: string) => justAdded.has(name)

export function subscribeProjectPreamble(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
