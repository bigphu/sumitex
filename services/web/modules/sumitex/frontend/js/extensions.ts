/**
 * Every SumiTeX CodeMirror extension, plugged in through the
 * sourceEditorExtensions slot. The slot expects a factory named `extension`.
 */
import type { Extension } from '@codemirror/state'
import { zenMode } from './editor/zen-mode'
import { inlineProblems } from './editor/inline-problems'
import { overviewRuler } from './editor/overview-ruler'
import { trackChangesBanner } from './editor/track-changes-banner'

export const extension = (): Extension => [
  zenMode(),
  inlineProblems(),
  overviewRuler(),
  trackChangesBanner(),
]
