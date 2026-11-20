/**
 * Mounted by the bridge: connects the linter and the "Add package" fixes
 * to the project.
 *
 * - Reads the main file's preamble, the project's own .cls and .sty files
 *   and an index of labels, citation keys and files from the project
 *   snapshot, into preamble-store.ts: when the editor opens, when you
 *   switch files and after every compile.
 * - Handles "Add package" (and "Load it earlier"): when the open file holds
 *   the preamble, the change goes straight in. When you are in a chapter, SumiTeX opens the main
 *   file, adds the line there, and takes you back to where you were, so
 *   the change is an ordinary edit you can see and undo.
 */
import { useCallback, useEffect, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { useProjectContext } from '@/shared/context/project-context'
import { useProjectSettingsContext } from '@/features/ide-settings/context/project-settings-context'
import { useFileTreePathContext } from '@/features/file-tree/contexts/file-tree-path'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import { useEditorManagerContext } from '@/features/ide-react/context/editor-manager-context'
import { useDetachCompileContext as useCompileContext } from '@/shared/context/detach-compile-context'
import { debugConsole } from '@/utils/debugging'
import { readPreamble, preambleOf, stripComments } from './preamble'
import { buildIndex } from './project-index'
import { markPackageAdded, setProjectPreamble } from './preamble-store'
import {
  addPackageInView,
  addPreambleLinesInView,
  setAddPackageHandler,
} from '../editor/add-package'

// Re-read at most this often, however many triggers arrive
const MIN_GAP_MS = 5000

// After leaving a snippet file, when its edits have reached the server
const SNIPPET_REREAD_MS = 2500

const hasPreamble = (view: EditorView) =>
  /\\documentclass/.test(stripComments(preambleOf(view.state.doc.toString())))

// Wait until the editor shows a file with a preamble (after opening one)
async function waitForPreamble(view: EditorView, timeoutMs = 4000) {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    if (hasPreamble(view)) return true
    await new Promise(resolve => window.setTimeout(resolve, 80))
  }
  return false
}

export function useProjectPreamble(view: EditorView) {
  const { projectSnapshot } = useProjectContext()
  const { rootDocId } = useProjectSettingsContext()
  const { pathInFolder } = useFileTreePathContext()
  const { currentDocumentId } = useEditorOpenDocContext()
  const { openDocWithId } = useEditorManagerContext()
  const { compiling } = useCompileContext()

  const mainPath = rootDocId ? pathInFolder(rootDocId) : null
  const lastRead = useRef(0)
  // The latest values, for callbacks that outlive a render
  const latest = useRef({
    rootDocId,
    currentDocumentId,
    openDocWithId,
    read: async (_force?: boolean) => {},
  })

  const read = useCallback(
    async (force = false) => {
      if (!force && Date.now() - lastRead.current < MIN_GAP_MS) return
      lastRead.current = Date.now()
      try {
        await projectSnapshot.refresh()
      } catch (error) {
        debugConsole.warn('SumiTeX: could not read the project', error)
        return
      }
      const projectFiles = new Map<string, string>()
      const docs = new Map<string, string>()
      for (const path of projectSnapshot.getDocPaths()) {
        const text = projectSnapshot.getDocContents(path) ?? ''
        docs.set(path, text)
        if (/\.(cls|sty)$/.test(path)) projectFiles.set(path.split('/').pop()!, text)
      }
      // Project snippets (completions/project-snippets.ts): root files first
      const snippetPaths = [...docs.keys()]
        .filter(path => path.endsWith('.sxs'))
        .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
      const snippets = snippetPaths.map(path => docs.get(path)).join('\n')
      const binaryPaths = projectSnapshot
        .getBinaryFilePathsWithHash()
        .map(file => file.path)
      const mainText = mainPath ? (docs.get(mainPath) ?? null) : null
      const { currentDocumentId } = latest.current
      setProjectPreamble({
        preamble: mainText ? readPreamble(mainText, projectFiles) : null,
        mainName: mainPath?.split('/').pop() ?? null,
        mainPath,
        projectFiles,
        // Snippet files hold templates, not labels and citations in use
        index: buildIndex(
          new Map([...docs].filter(([path]) => !path.endsWith('.sxs'))),
          binaryPaths,
          mainPath,
          mainText
        ),
        currentPath: currentDocumentId ? pathInFolder(currentDocumentId) : null,
        snippets: snippetPaths.length ? snippets : null,
        docs,
      })
    },
    [projectSnapshot, mainPath, pathInFolder]
  )

  // On open and on every file switch
  const leftPath = useRef<string | null>(null)
  useEffect(() => {
    read(true)
    // Leaving a snippet file: its last edits reach the server a moment
    // later, so read again then (completions/project-snippets.ts)
    const left = leftPath.current
    leftPath.current = currentDocumentId ? pathInFolder(currentDocumentId) : null
    if (!left?.endsWith('.sxs')) return
    const timer = window.setTimeout(() => read(true), SNIPPET_REREAD_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [read, currentDocumentId])

  // After every compile (the preamble may have changed in another file)
  const wasCompiling = useRef(compiling)
  useEffect(() => {
    if (wasCompiling.current && !compiling) read()
    wasCompiling.current = compiling
  }, [compiling, read])

  // "Add package"
  latest.current = { rootDocId, currentDocumentId, openDocWithId, read }

  useEffect(() => {
    setAddPackageHandler(async (name, options = {}) => {
      const { rootDocId, currentDocumentId, openDocWithId, read } = latest.current

      // Where the package is needed, in the editor now showing the preamble
      const usedAt = () => {
        if (options.usedAt !== undefined) return options.usedAt
        if (options.usedOnLine === undefined) return undefined
        const lines = view.state.doc.lines
        return view.state.doc.line(Math.min(Math.max(options.usedOnLine, 1), lines)).from
      }
      const apply = () => {
        const result = addPackageInView(view, name, usedAt())
        if (result === 'added' || result === 'moved') markPackageAdded(name)
        for (const more of options.alsoAdd ?? []) {
          if (result === 'failed') break
          const added = addPackageInView(view, more)
          if (added === 'added') markPackageAdded(more)
        }
        if (options.preambleLines && result !== 'failed') {
          addPreambleLinesInView(view, options.preambleLines)
        }
        return result
      }

      // The open file holds the preamble: change it here
      if (hasPreamble(view) || !rootDocId || rootDocId === currentDocumentId) {
        return apply()
      }

      // A chapter: change the main file, then come back
      const returnTo = currentDocumentId
      const head = view.state.selection.main.head
      const line = view.state.doc.lineAt(head)
      try {
        await openDocWithId(rootDocId)
        if (!(await waitForPreamble(view))) return 'failed'
        return apply()
      } finally {
        if (returnTo) {
          await openDocWithId(returnTo, {
            gotoLine: line.number,
            gotoColumn: head - line.from,
          })
        }
        read(true)
      }
    })
    return () => setAddPackageHandler(null)
  }, [view])
}
