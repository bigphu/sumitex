/**
 * The problems widget at the editor's own top-right (mockup frame 1):
 * ⓧ 1 ⚠ 3 ˄ ˅. Mounted inside the source editor through the
 * sourceEditorComponents slot and positioned in shell/_problems.scss.
 */
import ProblemsWidget from './problems-widget'

export default function EditorProblems() {
  return (
    <div className="sx-editor-problems">
      <ProblemsWidget />
    </div>
  )
}
