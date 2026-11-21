/**
 * Whole-word changes in the history view. The history service diffs by
 * character, so "brewed" → "roasted" comes back as
 * "We [+roast][-brew]ed": a change that starts or ends inside a word.
 * This widens every change to the words it touches and shows the old words
 * struck out, then the new ones: "We [-brewed][+roasted]".
 *
 * Applied to the diff chunks before highlights-from-diff-response.ts turns
 * them into the text and its highlights (diff-view.tsx, a marked line).
 * Changes that already start and end on word edges are left as they are.
 */
import type { DocDiffChunk } from '@/features/history/services/types/doc'

const WORD_TAIL = /[\p{L}\p{M}\p{N}_]+$/u
const WORD_HEAD = /^[\p{L}\p{M}\p{N}_]+/u

const WORD_CHAR = /[\p{L}\p{M}\p{N}_]/u

const isChange = (chunk: DocDiffChunk | undefined) =>
  typeof chunk?.i === 'string' || typeof chunk?.d === 'string'

export function wordDiff(chunks: DocDiffChunk[]): DocDiffChunk[] {
  const out: DocDiffChunk[] = []
  let index = 0

  while (index < chunks.length) {
    const chunk = chunks[index]
    if (!isChange(chunk)) {
      out.push({ ...chunk })
      index++
      continue
    }

    // The start of the word the change begins in, taken from the text before
    // (only when the change starts with a letter: it starts inside a word)
    let prefix = ''
    const previous = out[out.length - 1]
    const first = (chunk.i ?? chunk.d ?? '').charAt(0)
    if (previous && typeof previous.u === 'string' && WORD_CHAR.test(first)) {
      prefix = previous.u.match(WORD_TAIL)?.[0] ?? ''
      if (prefix) {
        previous.u = previous.u.slice(0, -prefix.length)
        if (!previous.u) out.pop()
      }
    }

    // The change, and any changes in the same word after it, up to the end
    // of that word
    let oldText = prefix
    let newText = prefix
    let deletionMeta: DocDiffChunk['meta']
    let insertionMeta: DocDiffChunk['meta']
    let hasDeletion = false
    let hasInsertion = false
    let suffix = ''
    let rest: string | undefined
    let lastChange = ''

    while (index < chunks.length) {
      const next = chunks[index]
      if (typeof next.i === 'string') {
        lastChange = next.i
        newText += next.i
        insertionMeta ??= next.meta
        hasInsertion = true
        index++
      } else if (typeof next.d === 'string') {
        lastChange = next.d
        oldText += next.d
        deletionMeta ??= next.meta
        hasDeletion = true
        index++
      } else {
        const text = next.u ?? ''
        // The rest of the word, if the change ended inside one
        const head = WORD_CHAR.test(lastChange.slice(-1))
          ? (text.match(WORD_HEAD)?.[0] ?? '')
          : ''
        oldText += head
        newText += head
        suffix += head
        index++
        if (head.length === text.length && isChange(chunks[index])) {
          continue // the word goes on into another change
        }
        rest = text.slice(head.length)
        break
      }
    }

    // Already on word edges: keep the change as the service sent it
    const widened = prefix !== '' || suffix !== ''
    if (hasDeletion && (widened || oldText)) {
      out.push({ d: oldText, meta: deletionMeta ?? insertionMeta })
    } else if (widened && oldText) {
      out.push({ d: oldText, meta: insertionMeta })
    }
    if (hasInsertion && newText) {
      out.push({ i: newText, meta: insertionMeta ?? deletionMeta })
    } else if (widened && newText) {
      out.push({ i: newText, meta: deletionMeta })
    }
    if (rest) {
      out.push({ u: rest })
    }
  }

  return out
}
