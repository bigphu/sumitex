import AnonymousEditorRouter from './app/src/AnonymousEditorRouter.mjs'
import GuideRouter from './app/src/GuideRouter.mjs'
import FolderOrderRouter from './app/src/FolderOrderRouter.mjs'
import ThumbnailRouter, { deleteThumbnail } from './app/src/ThumbnailRouter.mjs'
import { ensureGuideMember } from './app/src/GuideManager.mjs'

/**
 * SumiTeX's server-side module: what SumiTeX needs from the web service
 * without editing Overleaf's own files.
 *
 * - Saving after an anonymous edit (AnonymousEditorRouter.mjs)
 * - The SumiTeX guide: the handbook shared with everyone, and a playground
 *   per user (GuideManager.mjs, GuideRouter.mjs)
 * - The order of the dashboard's folders (FolderOrderRouter.mjs)
 * - Project thumbnails for the dashboard (ThumbnailRouter.mjs), removed when
 *   a project is deleted for good (the projectExpired hook)
 *
 * @import { WebModule } from "../../types/web-module"
 */

/** @type {WebModule} */
const SumitexModule = {
  router: {
    applyNonCsrfRouter: AnonymousEditorRouter.applyNonCsrfRouter,
    apply(webRouter, privateApiRouter, publicApiRouter) {
      GuideRouter.apply(webRouter, privateApiRouter, publicApiRouter)
      FolderOrderRouter.apply(webRouter)
      ThumbnailRouter.apply(webRouter)
    },
  },
  hooks: {
    // Every sign-in: join the handbook once (it never blocks signing in)
    preFinishLogin(req, res, user, callback) {
      ensureGuideMember(user?._id).then(() => callback(), () => callback())
    },
    promises: {
      // A project deleted for good: its dashboard thumbnail goes with it
      async projectExpired(projectId) {
        await deleteThumbnail(projectId)
      },
    },
  },
}

export default SumitexModule
