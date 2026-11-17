/**
 * The project's main preamble and index, shared with the linters (a CodeMirror
 * extension, outside React). The bridge fills it from the project snapshot
 * (diagnostics/use-project-preamble.ts) and the linter reads it, so a
 * chapter file is checked against the packages main.tex loads.
 *
 * Packages added from SumiTeX's own fixes count as loaded at once, before
 * the snapshot catches up, so the underline goes as soon as you click.
 */
import type { Preamble } from './preamble'
import type { ProjectIndex } from './project-index'

type State = {
  /** null until the main file has been read */
  preamble: Preamble | null
  /** The main file's name, for messages ("goes into main.tex") */
  mainName: string | null
  /** The main file's project path, to recognise it when it is open */
  mainPath: string | null
  /** The project's own .cls and .sty files, by base name */
  projectFiles: Map<string, string>
  /** Labels, citation keys and files across the project */
  index: ProjectIndex | null
  /** The open file's project path, left out of the index (it is read live) */
  currentPath: string | null
  /** The project's .sxs snippet files, one after another (root ones first) */
  snippets?: string | null
}

let state: State = {
  preamble: null,
  mainName: null,
  mainPath: null,
  projectFiles: new Map(),
  index: null,
  currentPath: null,
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
