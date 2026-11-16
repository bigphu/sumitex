// SumiTeX: "Current chapter only" (the run widget's third profile). Like
// draft mode (DraftModeManager.js), it changes this compile's copy of the
// main file, never the project: \includeonly{<chapter>} goes just before
// \begin{document}, so only that \include'd chapter is typeset and the
// others keep their page numbers and references from their .aux files.
import fsPromises from 'node:fs/promises'
import { callbackify } from 'node:util'
import logger from '@overleaf/logger'

async function injectIncludeOnly(filename, includeOnly) {
  const content = await fsPromises.readFile(filename, { encoding: 'utf8' })
  const marker = '\\begin{document}'
  const index = content.indexOf(marker)
  if (index === -1) {
    // Not a main file with a document body: compile everything as usual
    logger.debug({ filename }, 'no \\begin{document}, includeonly skipped')
    return
  }
  const modifiedContent =
    content.slice(0, index) +
    `\\includeonly{${includeOnly}}\n` +
    content.slice(index)
  await fsPromises.writeFile(filename, modifiedContent, { encoding: 'utf8' })
}

export default {
  injectIncludeOnly: callbackify(injectIncludeOnly),
  promises: { injectIncludeOnly },
}
