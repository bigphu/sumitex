import { useMemo } from 'react'
import { CommandPaletteSource } from '../types'
import useCommandRegistrySource from './use-command-registry-source'
import useFileTreeCommandSource from './use-file-tree-command-source'
import { useJumpToLineCommandSource } from './use-jump-to-line-command-source'
import { useSectionsSource } from '@modules/sumitex/frontend/js/palette/use-sections-source' // SumiTeX
import { useLabelsSource } from '@modules/sumitex/frontend/js/palette/use-labels-source' // SumiTeX
import { useRecentFilesSource } from '@modules/sumitex/frontend/js/palette/recent-files' // SumiTeX
import { useLineHintSource } from '@modules/sumitex/frontend/js/palette/use-line-hint-source' // SumiTeX

const useCommandPaletteSources = (): CommandPaletteSource[] => {
  const fileTreeSource = useFileTreeCommandSource()
  const commandRegistrySource = useCommandRegistrySource()
  const jumpToLineSource = useJumpToLineCommandSource()
  // SumiTeX: @ sections, # labels, recent files, the : hint
  const sectionsSource = useSectionsSource()
  const labelsSource = useLabelsSource()
  const recentSource = useRecentFilesSource()
  const lineHintSource = useLineHintSource()

  const sources = useMemo(
    () => [
      fileTreeSource,
      commandRegistrySource,
      jumpToLineSource,
      sectionsSource, // SumiTeX
      labelsSource, // SumiTeX
      recentSource, // SumiTeX
      lineHintSource, // SumiTeX
    ],
    [
      fileTreeSource,
      commandRegistrySource,
      jumpToLineSource,
      sectionsSource,
      labelsSource,
      recentSource,
      lineHintSource,
    ]
  )
  return sources
}

export default useCommandPaletteSources
