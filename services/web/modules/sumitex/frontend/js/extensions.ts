/**
 * Every SumiTeX CodeMirror extension, plugged in through the
 * sourceEditorExtensions slot. The slot expects a factory named `extension`.
 */
import type { Extension } from '@codemirror/state'
import { zenMode } from './editor/zen-mode'

export const extension = (): Extension => [zenMode()]
