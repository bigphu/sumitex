/**
 * The order of a user's dashboard folders. Folders are tags (a tag's
 * parent_id nests them); their order lives here, apart from the tags, so
 * Overleaf's Tag model stays as it is.
 *
 * - GET  /sumitex/folders/order   → { order: [tagId, …] }
 * - POST /sumitex/folders/order   { order: [tagId, …] } → 204
 *
 * The list holds every folder in tree order; the dashboard sorts each
 * folder's subfolders by their place in it, and by name when a folder is
 * missing (made since, or never moved).
 */
import { expressify } from '@overleaf/promise-utils'
import { getCollectionInternal } from '../../../../app/src/infrastructure/mongodb.mjs'
import AuthenticationController from '../../../../app/src/Features/Authentication/AuthenticationController.mjs'
import SessionManager from '../../../../app/src/Features/Authentication/SessionManager.mjs'

const MAX_FOLDERS = 2000
const ID = /^[0-9a-f]{24}$/

const collection = () => getCollectionInternal('sumitexFolderOrder')

async function read(req, res) {
  const userId = SessionManager.getLoggedInUserId(req.session)
  const doc = await (await collection()).findOne({ _id: String(userId) })
  res.json({ order: doc?.order ?? [] })
}

async function write(req, res) {
  const userId = SessionManager.getLoggedInUserId(req.session)
  const order = req.body?.order
  if (
    !Array.isArray(order) ||
    order.length > MAX_FOLDERS ||
    !order.every(id => typeof id === 'string' && ID.test(id))
  ) {
    return res.status(400).json({ error: 'Expected a list of folder ids' })
  }
  await (await collection()).updateOne(
    { _id: String(userId) },
    { $set: { order: [...new Set(order)], updatedAt: new Date() } },
    { upsert: true }
  )
  res.sendStatus(204)
}

export default {
  apply(webRouter) {
    webRouter.get('/sumitex/folders/order', AuthenticationController.requireLogin(), expressify(read))
    webRouter.post('/sumitex/folders/order', AuthenticationController.requireLogin(), expressify(write))
  },
}
