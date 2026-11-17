/**
 * Where the cursor is, for features that behave differently in math: math
 * snippets (completions/snippets-with-packages.ts) and math auto-expansion
 * (editor/math-auto-expand.ts).
 *
 * - 'math': inside $…$, \(…\), \[…\], or an equation-like environment
 *   (equation, align, gather…), even an empty one
 * - 'math-text': in math, but inside \text{…}, \mathrm{…}, \label{…} and the
 *   like, where words are words
 * - 'text': anywhere else
 */
import type { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'

export type MathContext = 'math' | 'math-text' | 'text'

const MATH_NODES = new Set(['Math', 'InlineMath', 'DisplayMath'])
const MATH_ENVIRONMENTS = new Set([
  'EquationEnvironment',
  'EquationArrayEnvironment',
])

// Commands whose argument holds words, names or keys, not math
const TEXT_ARGUMENT =
  /\\(?:text[a-z]*|mathrm|operatorname|label|ref|eqref|cref|Cref|autoref|pageref|mbox|hbox|tag|intertext|shortintertext)\*?\s*(?:\[[^\]]*\])?\s*$/

function mathStart(state: EditorState, pos: number): number | null {
  for (
    let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1);
    node;
    node = node.parent
  ) {
    if (node.type.is('MathTextCommand')) return null
    if (MATH_NODES.has(node.type.name)) return node.from
    // An empty equation has no Math node yet, only the environment's Content
    if (
      node.type.is('Content') &&
      node.parent &&
      MATH_ENVIRONMENTS.has(node.parent.type.name)
    ) {
      return node.from
    }
  }
  return null
}

/** Inside a brace group of a text-like command, within the math */
function inTextArgument(state: EditorState, from: number, pos: number) {
  const text = state.sliceDoc(from, pos)
  let depth = 0
  for (let i = text.length - 1; i >= 0; i--) {
    const char = text[i]
    if (text[i - 1] === '\\') continue // \{ and \}
    if (char === '}') depth++
    else if (char === '{') {
      if (depth > 0) depth--
      else if (TEXT_ARGUMENT.test(text.slice(0, i))) return true
    }
  }
  return false
}

export function mathContextAt(state: EditorState, pos: number): MathContext {
  const start = mathStart(state, pos)
  if (start === null) {
    // \text{…} inside math is a MathTextCommand: words, not math
    return 'text'
  }
  return inTextArgument(state, start, pos) ? 'math-text' : 'math'
}
