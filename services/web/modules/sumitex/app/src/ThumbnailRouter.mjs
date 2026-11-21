/**
 * Project thumbnails: a small image of the first PDF page, for the
 * dashboard. The editor draws it after a compile (pdf-thumbnail.ts) and
 * sends it here; nothing new runs on the server.
 *
 * - POST /sumitex/project/:Project_id/thumbnail  { image: data URL } → 204
 *   (anyone who can edit the project)
 * - GET  /sumitex/project/:Project_id/thumbnail  → the image
 *   (anyone who can read it; ?v=<time> makes the URL change with it)
 * - POST /sumitex/thumbnails  { ids: [projectId, …] } → { thumbnails: { id: time } }
 *   which of those projects have one, among the ones the user can read
 *
 * Images live in their own collection (sumitexThumbnails), keyed by project,
 * so Overleaf's Project model stays as it is.
 */
import { expressify } from '@overleaf/promise-utils'
import { getCollectionInternal } from '../../../../app/src/infrastructure/mongodb.mjs'
import AuthenticationController from '../../../../app/src/Features/Authentication/AuthenticationController.mjs'
import AuthorizationMiddleware from '../../../../app/src/Features/Authorization/AuthorizationMiddleware.mjs'
import AuthorizationManager from '../../../../app/src/Features/Authorization/AuthorizationManager.mjs'
import SessionManager from '../../../../app/src/Features/Authentication/SessionManager.mjs'

const MAX_BYTES = 200 * 1024
const MAX_IDS = 5000
const ID = /^[0-9a-f]{24}$/

// The formats the editor sends, and how each file starts
const FORMATS = {
  'image/webp': buffer =>
    buffer.toString('latin1', 0, 4) === 'RIFF' &&
    buffer.toString('latin1', 8, 12) === 'WEBP',
  'image/jpeg': buffer => buffer[0] === 0xff && buffer[1] === 0xd8,
  'image/png': buffer =>
    buffer.toString('latin1', 1, 4) === 'PNG' && buffer[0] === 0x89,
}

const collection = () => getCollectionInternal('sumitexThumbnails')

async function save(req, res) {
  const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(
    typeof req.body?.image === 'string' ? req.body.image : ''
  )
  const type = match?.[1]
  const check = type && FORMATS[type]
  if (!check) {
    return res.status(400).json({ error: 'Expected a WebP, JPEG or PNG data URL' })
  }
  const image = Buffer.from(match[2], 'base64')
  if (image.length === 0 || image.length > MAX_BYTES || !check(image)) {
    return res.status(400).json({ error: 'Not a valid image, or too large' })
  }
  await (await collection()).updateOne(
    { _id: String(req.params.Project_id) },
    { $set: { type, image, updatedAt: new Date() } },
    { upsert: true }
  )
  res.sendStatus(204)
}

async function show(req, res) {
  const doc = await (await collection()).findOne({
    _id: String(req.params.Project_id),
  })
  if (!doc) {
    return res.sendStatus(404)
  }
  res.set({
    'Content-Type': doc.type,
    'X-Content-Type-Options': 'nosniff',
    // The dashboard asks with ?v=<time>, so a new image is a new URL
    'Cache-Control': req.query.v
      ? 'private, max-age=31536000, immutable'
      : 'private, no-cache',
  })
  res.send(doc.image.buffer ?? doc.image)
}

async function lookup(req, res) {
  const ids = req.body?.ids
  if (
    !Array.isArray(ids) ||
    ids.length > MAX_IDS ||
    !ids.every(id => typeof id === 'string' && ID.test(id))
  ) {
    return res.status(400).json({ error: 'Expected a list of project ids' })
  }
  const userId = SessionManager.getLoggedInUserId(req.session)
  const docs = await (await collection())
    .find({ _id: { $in: [...new Set(ids)] } }, { projection: { updatedAt: 1 } })
    .toArray()
  // Only the projects this user can read (checked for the few that have one)
  const readable = await Promise.all(
    docs.map(doc =>
      AuthorizationManager.promises
        .canUserReadProject(userId, doc._id, null)
        .catch(() => false)
    )
  )
  const thumbnails = {}
  docs.forEach((doc, index) => {
    if (readable[index]) thumbnails[doc._id] = doc.updatedAt.getTime()
  })
  res.json({ thumbnails })
}

export default {
  apply(webRouter) {
    webRouter.post(
      '/sumitex/project/:Project_id/thumbnail',
      AuthorizationMiddleware.ensureUserCanWriteProjectContent,
      expressify(save)
    )
    webRouter.get(
      '/sumitex/project/:Project_id/thumbnail',
      AuthorizationMiddleware.ensureUserCanReadProject,
      expressify(show)
    )
    webRouter.post(
      '/sumitex/thumbnails',
      AuthenticationController.requireLogin(),
      expressify(lookup)
    )
  },
}
