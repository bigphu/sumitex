/**
 * The run widget's compile profile (mockup frame 6): Full build, Draft, or
 * Current chapter only. Draft uses the stock draft option. "Current chapter
 * only" sends includeOnly with the open file's path, and the compile server
 * adds \includeonly{<that file>} to its copy of the main file.
 *
 * The compile request reads getIncludeOnly() (one marked line in
 * features/pdf-preview/util/compiler.ts).
 */
export type CompileProfile = 'full' | 'draft' | 'chapter'

const keyFor = (projectId: string) => `sumitex.compile-profile.${projectId}`

let projectId: string | null = null
let profile: CompileProfile = 'full'
let chapter: string | null = null // the open file, if it's not the main file
const listeners = new Set<() => void>()

export const loadProfile = (id: string) => {
  projectId = id
  try {
    const saved = localStorage.getItem(keyFor(id))
    profile = saved === 'draft' || saved === 'chapter' ? saved : 'full'
  } catch {
    profile = 'full'
  }
  listeners.forEach(listener => listener())
}

export const getProfile = () => profile

export const setProfile = (next: CompileProfile) => {
  profile = next
  try {
    if (projectId) localStorage.setItem(keyFor(projectId), next)
  } catch {
    // storage blocked: the choice lasts until reload
  }
  listeners.forEach(listener => listener())
}

export const subscribeProfile = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The open file's path, e.g. chapters/03-method.tex; null for the main file. */
export const setCurrentChapter = (path: string | null) => {
  chapter = path
  listeners.forEach(listener => listener())
}

export const getCurrentChapter = () => chapter

/** What \includeonly needs: the path without .tex, or undefined. */
export const getIncludeOnly = (): string | undefined =>
  profile === 'chapter' && chapter ? chapter.replace(/\.tex$/, '') : undefined
