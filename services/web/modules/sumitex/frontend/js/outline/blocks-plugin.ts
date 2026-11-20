/**
 * Scans the open file's blocks for the Outline, shortly after typing stops
 * (and once when a file opens), and hands them to blocks-store.ts.
 */
import { ViewPlugin, ViewUpdate, EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { debugConsole } from '@/utils/debugging'
import { scanBlocks } from './scan-blocks'
import { setBlocks } from './blocks-store'

const AFTER_TYPING_MS = 600
const ON_OPEN_MS = 50

export const outlineBlocks = () =>
  ViewPlugin.fromClass(
    class {
      timer: number | null = null

      constructor(readonly view: EditorView) {
        this.schedule(ON_OPEN_MS)
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          syntaxTree(update.state) !== syntaxTree(update.startState)
        ) {
          this.schedule(AFTER_TYPING_MS)
        }
      }

      schedule(ms: number) {
        if (this.timer !== null) window.clearTimeout(this.timer)
        this.timer = window.setTimeout(() => {
          this.timer = null
          try {
            setBlocks(scanBlocks(this.view.state))
          } catch (error) {
            debugConsole.debug('SumiTeX: could not scan the outline', error)
          }
        }, ms)
      }

      destroy() {
        if (this.timer !== null) window.clearTimeout(this.timer)
      }
    }
  )
