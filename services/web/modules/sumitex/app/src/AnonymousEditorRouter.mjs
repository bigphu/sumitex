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
 *
 * The same visitor also gets a bare-bones settings object for the editor
 * (defaultSettingsForAnonymousUser in ProjectController) with no value for
 * the equation preview, which the editor reads as off. The page's settings
 * are completed here before the page is rendered.
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

/**
 * The editor settings a visitor with no account gets, with what Overleaf
 * leaves out filled in: the equation preview, which is on for everyone else
 *
 * @param {Record<string, any>} settings
 */
export function withAnonymousDefaults(settings) {
  if (settings.mathPreview != null) return settings
  return { ...settings, mathPreview: true }
}

/**
 * Completes the settings handed to the editor page, for anonymous visitors
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function completeAnonymousSettings(req, res, next) {
  const render = res.render
  // @ts-ignore render's overloads
  res.render = function (view, options, callback) {
    if (options && options.anonymous === true && options.userSettings) {
      options.userSettings = withAnonymousDefaults(options.userSettings)
    }
    return render.call(this, view, options, callback)
  }
  next()
}

export default {
  /**
   * @param {any} webRouter
   * @param {any} privateApiRouter
   */
  applyNonCsrfRouter(webRouter, privateApiRouter) {
    // The editor page (and its detached PDF window)
    webRouter.get(
      /^\/[pP]roject\/[0-9a-f]{24}(\/(detacher|detached))?$/,
      completeAnonymousSettings
    )
    // Registered before Overleaf's own routes, so it runs first
    privateApiRouter.post(
      '/project/:Project_id/doc/:doc_id',
      noLastUpdaterForAnonymous
    )
  },
}
