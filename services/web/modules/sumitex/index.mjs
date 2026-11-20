import AnonymousEditorRouter from './app/src/AnonymousEditorRouter.mjs'
import GuideRouter from './app/src/GuideRouter.mjs'
import { ensureGuideMember } from './app/src/GuideManager.mjs'

/**
 * SumiTeX's server-side module: what SumiTeX needs from the web service
 * without editing Overleaf's own files.
 *
 * - Saving after an anonymous edit (AnonymousEditorRouter.mjs)
 * - The SumiTeX guide: the handbook shared with everyone, and a playground
 *   per user (GuideManager.mjs, GuideRouter.mjs)
 *
 * @import { WebModule } from "../../types/web-module"
 */

/** @type {WebModule} */
const SumitexModule = {
  router: {
    applyNonCsrfRouter: AnonymousEditorRouter.applyNonCsrfRouter,
    apply: GuideRouter.apply,
  },
  hooks: {
    // Every sign-in: join the handbook once (it never blocks signing in)
    preFinishLogin(req, res, user, callback) {
      ensureGuideMember(user?._id).then(() => callback(), () => callback())
    },
  },
}

export default SumitexModule
