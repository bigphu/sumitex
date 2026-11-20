/**
 * Routes for the SumiTeX guide (GuideManager.mjs):
 *
 * - GET  /sumitex/guide             what the page shows: the handbook, the
 *                                   user's playground and whether it is
 *                                   outdated (and joins the handbook)
 * - GET  /sumitex/guide/open        opens the handbook
 * - POST /sumitex/playground        { fresh?: true } → { projectId }: the
 *                                   user's playground, made if needed
 *
 * Signed-in users only; anonymous visitors of a shared link get nothing.
 */
import logger from '@overleaf/logger'
import { expressify } from '@overleaf/promise-utils'
import AuthenticationController from '../../../../app/src/Features/Authentication/AuthenticationController.mjs'
import SessionManager from '../../../../app/src/Features/Authentication/SessionManager.mjs'
import { guideInfo, guideSettings, openPlayground } from './GuideManager.mjs'

async function info(req, res) {
  const userId = SessionManager.getLoggedInUserId(req.session)
  res.json(await guideInfo(userId))
}

async function openGuide(req, res) {
  const { guideProjectId } = await guideSettings()
  res.redirect(guideProjectId ? `/project/${guideProjectId}` : '/project')
}

async function playground(req, res) {
  const userId = SessionManager.getLoggedInUserId(req.session)
  try {
    const projectId = await openPlayground(userId, { fresh: Boolean(req.body?.fresh) })
    res.json({ projectId })
  } catch (error) {
    logger.warn({ err: error, userId }, 'SumiTeX: could not open the playground')
    res.status(500).json({ error: 'The playground could not be opened.' })
  }
}

export default {
  apply(webRouter) {
    webRouter.get('/sumitex/guide', AuthenticationController.requireLogin(), expressify(info))
    webRouter.get('/sumitex/guide/open', AuthenticationController.requireLogin(), expressify(openGuide))
    webRouter.post('/sumitex/playground', AuthenticationController.requireLogin(), expressify(playground))
  },
}
