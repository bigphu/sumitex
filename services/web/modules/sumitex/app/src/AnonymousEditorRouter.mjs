/**
 * Saving a document last edited by a visitor who has no account.
 *
 * A visitor who opens an edit link without an account (link sharing, with
 * OVERLEAF_ALLOW_PUBLIC_ACCESS and OVERLEAF_ALLOW_ANONYMOUS_READ_AND_WRITE_
 * SHARING on) is identified by the real-time service as the sentinel
 * 'anonymous-user', and document-updater passes that on as the document's
 * "last updated by" when it saves. The save route only accepts an ObjectId
 * there, so it answered 400 for every save of a document such a visitor had
 * last touched. Every compile starts with that save, so the project could
 * not be compiled until a signed-in user edited the document again.
 *
 * This runs before that route and reports no last updater for such a
 * visitor, which the route already accepts. Keeping it here leaves
 * Overleaf's own controller untouched.
 */

export const ANONYMOUS_USER = 'anonymous-user'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function noLastUpdaterForAnonymous(req, res, next) {
  if (req.body && req.body.lastUpdatedBy === ANONYMOUS_USER) {
    req.body.lastUpdatedBy = null
  }
  next()
}

export default {
  /**
   * @param {any} webRouter
   * @param {any} privateApiRouter
   */
  applyNonCsrfRouter(webRouter, privateApiRouter) {
    // Registered before Overleaf's own routes, so it runs first
    privateApiRouter.post(
      '/project/:Project_id/doc/:doc_id',
      noLastUpdaterForAnonymous
    )
  },
}
