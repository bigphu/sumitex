/**
 * Palette commands for project snippets (completions/project-snippets.ts):
 *
 * - "Snippets: Open project snippets" opens the project's snippets.sxs,
 *   creating it (with a short guide and an example) when there is none.
 * - "Snippets: New snippet from selection" adds the selected text to it as
 *   a new snippet: the trigger, label and packages (guessed from the text)
 *   are placeholders to type over, Tab moving between them.
 */
import { useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { Completion, snippet } from '@codemirror/autocomplete'
import { useCommandProvider } from '@/features/ide-react/hooks/use-command-provider'
import { useEditorManagerContext } from '@/features/ide-react/context/editor-manager-context'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import { useFileTreeData } from '@/shared/context/file-tree-data-context'
import { useProjectContext } from '@/shared/context/project-context'
import getMeta from '@/utils/meta'
import type { Folder } from '../../../../../types/folder'
import { debugConsole } from '@/utils/debugging'
import { SNIPPET_FILE, newSnippetTemplate, starterText } from './snippet-file'

const OPEN_TIMEOUT_MS = 6000
const SETTLE_MS = 300

/** The project's snippet files, root ones first: [id, path] */
function snippetDocs(folder: Folder, prefix = ''): [string, string][] {
  const here = folder.docs
    .filter(doc => doc.name.endsWith('.sxs'))
    .map(doc => [doc._id, prefix + doc.name] as [string, string])
    .sort(([, a], [, b]) =>
      a === SNIPPET_FILE ? -1 : b === SNIPPET_FILE ? 1 : a.localeCompare(b)
    )
  return [
    ...here,
    ...folder.folders.flatMap(sub => snippetDocs(sub, `${prefix}${sub.name}/`)),
  ]
}

/** True once Overleaf has opened the doc, false if it doesn't in time */
function afterOpened(docId: string) {
  return new Promise<boolean>(resolve => {
    const finish = (result: boolean) => {
      window.removeEventListener('doc:after-opened', listener)
      window.clearTimeout(timer)
      resolve(result)
    }
    const listener = (event: Event) => {
      if ((event as CustomEvent).detail?.docId === docId) finish(true)
    }
    const timer = window.setTimeout(() => finish(false), OPEN_TIMEOUT_MS)
    window.addEventListener('doc:after-opened', listener)
  })
}

async function until(test: () => boolean, timeoutMs = OPEN_TIMEOUT_MS) {
  const end = Date.now() + timeoutMs
  while (!test()) {
    if (Date.now() > end) return false
    await new Promise(resolve => window.setTimeout(resolve, 60))
  }
  return true
}

export function useSnippetCommands(view: EditorView) {
  const { projectId } = useProjectContext()
  const { fileTreeData } = useFileTreeData()
  const { openDocWithId } = useEditorManagerContext()
  const { currentDocumentId, currentDocument } = useEditorOpenDocContext()

  // The latest values, for commands that wait across renders
  // (openDocWithId only finds files in the tree it was made with)
  const latest = useRef({
    fileTreeData,
    currentDocumentId,
    currentDocument,
    openDocWithId,
  })
  latest.current = {
    fileTreeData,
    currentDocumentId,
    currentDocument,
    openDocWithId,
  }

  // The editor shows this doc: it is the open one, and the editor has its
  // text (for a moment after a switch it still holds the previous file's)
  const inView = (docId: string) =>
    latest.current.currentDocumentId === docId &&
    latest.current.currentDocument?.getSnapshot() === view.state.doc.toString()

  /** Open the snippet file (made if missing); false if that failed */
  const openSnippetFile = async () => {
    let id = snippetDocs(latest.current.fileTreeData)[0]?.[0]
    if (!id) {
      // Uploaded with its text, so it arrives whole (text typed into a doc
      // that is still being set up can be lost)
      try {
        const form = new FormData()
        form.append('name', SNIPPET_FILE)
        form.append('relativePath', 'null')
        form.append(
          'qqfile',
          new Blob([starterText()], { type: 'text/plain' }),
          SNIPPET_FILE
        )
        const response = await fetch(
          `/project/${projectId}/upload?folder_id=${latest.current.fileTreeData._id}`,
          {
            method: 'POST',
            body: form,
            headers: { 'X-CSRF-TOKEN': getMeta('ol-csrfToken') },
          }
        )
        const body = await response.json()
        if (!response.ok || body.entity_type !== 'doc') {
          throw new Error(body.error ?? `HTTP ${response.status}`)
        }
        id = body.entity_id as string
      } catch (error) {
        debugConsole.error('SumiTeX: could not create snippets.sxs', error)
        return false
      }
      // The file tree hears about the new file a moment later, and only
      // then can it be opened
      const made = id
      await until(() =>
        snippetDocs(latest.current.fileTreeData).some(([doc]) => doc === made)
      )
    }
    const docId = id
    if (!inView(docId)) {
      // Overleaf says when the doc is open; the editor gets its text then,
      // and joining it settles a moment later (an edit made before that is
      // lost)
      const opened = afterOpened(docId)
      await latest.current.openDocWithId(docId)
      if (!(await opened)) return false
      await new Promise(resolve => window.setTimeout(resolve, SETTLE_MS))
      if (!(await until(() => inView(docId)))) return false
    }
    return true
  }

  useCommandProvider(
    () => [
      {
        id: 'sumitex-open-project-snippets',
        label: 'Snippets: Open project snippets',
        handler: () => {
          void openSnippetFile()
        },
      },
      {
        id: 'sumitex-new-snippet-from-selection',
        label: 'Snippets: New snippet from selection',
        handler: () => {
          const { from, to } = view.state.selection.main
          const selected = view.state.sliceDoc(from, to)
          void (async () => {
            if (!(await openSnippetFile())) return
            const end = view.state.doc.length
            const template = newSnippetTemplate(selected)
            snippet(template)(view, { label: 'new snippet' } as Completion, end, end)
            view.focus()
          })()
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, projectId]
  )
}
