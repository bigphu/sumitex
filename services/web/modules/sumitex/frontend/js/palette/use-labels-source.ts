/**
 * Labels in the palette (type "#"): every \label{…} in the open file, with
 * what it labels (from its prefix: fig:, tab:, eq:, sec:…) and file:line
 * on the right. Picking one jumps there. The whole project's labels come
 * with go to definition (P2).
 */
import { useMemo } from 'react'
import { useEditorViewContext } from '@/features/ide-react/context/editor-view-context'
import { useEditorManagerContext } from '@/features/ide-react/context/editor-manager-context'
import { useEditorOpenDocContext } from '@/features/ide-react/context/editor-open-doc-context'
import type {
  CommandPaletteSearchResult,
  CommandPaletteSource,
} from '@/features/command-palette/types'
import { matchesWords } from './use-sections-source'

const KINDS: Record<string, string> = {
  fig: 'Figure',
  tab: 'Table',
  eq: 'Equation',
  sec: 'Section',
  subsec: 'Section',
  ch: 'Chapter',
  chap: 'Chapter',
  thm: 'Theorem',
  lem: 'Lemma',
  def: 'Definition',
  lst: 'Listing',
  alg: 'Algorithm',
  app: 'Appendix',
}

const LABEL = /\\label\{([^}]+)\}/g

export function useLabelsSource(): CommandPaletteSource {
  const { view } = useEditorViewContext()
  const { jumpToLine } = useEditorManagerContext()
  const { openDocName } = useEditorOpenDocContext()

  return useMemo(() => {
    // Read the file when the palette asks, so it is always current
    const labels = () => {
      if (!view) return []
      const doc = view.state.doc
      return [...doc.toString().matchAll(LABEL)].map(match => {
        const key = match[1]
        return {
          key,
          kind: KINDS[key.split(':')[0]],
          line: doc.lineAt(match.index!).number,
        }
      })
    }

    const toResult = (
      label: ReturnType<typeof labels>[number],
      score: number
    ): CommandPaletteSearchResult => ({
      title: label.key,
      description: label.kind,
      onSelect: () => jumpToLine({ gotoLine: label.line }),
      score,
      eventSegmentation: { source: 'jump-to-line' },
      sumitex: {
        group: 'Labels in this file',
        glyph: '#',
        location: `${openDocName ?? ''}:${label.line}`,
      },
    })

    return {
      id: 'sumitex-labels',
      prefix: '#',
      prefixRequired: true,
      defaults: () => {
        const all = labels()
        return all.map((label, index) => toResult(label, all.length - index))
      },
      search: query => {
        const all = labels()
        return all
          .map((label, index) => ({ label, index }))
          .filter(({ label }) =>
            matchesWords(`${label.key} ${label.kind ?? ''}`, query)
          )
          .map(({ label, index }) => toResult(label, all.length - index))
      },
    }
  }, [view, jumpToLine, openDocName])
}
