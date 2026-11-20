/**
 * The SumiTeX guide: a handbook every user can read, and a playground of
 * their own to practise in (guide/ in the repository holds both projects'
 * sources).
 *
 * - The handbook is an ordinary project owned by an admin. Every user is
 *   added to it once, read-only, on signing in (site admins as editors),
 *   so it appears under "Shared with you" and only admins can change it.
 *   Someone who leaves it isn't added again.
 * - The playground: the first time a user asks, the admin's master
 *   playground is copied for them ("Sân tập SumiTeX"); after that the same
 *   copy opens. "Start over" renames the old copy and makes a new one.
 *   The master's main.tex carries a line "% Phiên bản sân tập: …"; a copy
 *   made from an older one reports "outdated" so the user can take a new
 *   copy. Their own copy is never changed.
 *
 * Which projects: SUMITEX_GUIDE_PROJECT_ID and SUMITEX_PLAYGROUND_PROJECT_ID
 * in the environment, or a document { _id: 'guide', guideProjectId,
 * playgroundProjectId } in the sumitexSettings collection. Without them
 * the guide is off and nothing here does anything.
 */
import logger from '@overleaf/logger'
import {
  ObjectId,
  getCollectionInternal,
} from '../../../../app/src/infrastructure/mongodb.mjs'
import ProjectGetter from '../../../../app/src/Features/Project/ProjectGetter.mjs'
import ProjectDuplicator from '../../../../app/src/Features/Project/ProjectDuplicator.mjs'
import ProjectDetailsHandler from '../../../../app/src/Features/Project/ProjectDetailsHandler.mjs'
import ProjectEntityHandler from '../../../../app/src/Features/Project/ProjectEntityHandler.mjs'
import CollaboratorsHandler from '../../../../app/src/Features/Collaborators/CollaboratorsHandler.mjs'
import CollaboratorsGetter from '../../../../app/src/Features/Collaborators/CollaboratorsGetter.mjs'
import AuthorizationManager from '../../../../app/src/Features/Authorization/AuthorizationManager.mjs'
import PrivilegeLevels from '../../../../app/src/Features/Authorization/PrivilegeLevels.mjs'
import UserGetter from '../../../../app/src/Features/User/UserGetter.mjs'
import DocumentUpdaterHandler from '../../../../app/src/Features/DocumentUpdater/DocumentUpdaterHandler.mjs'

export const PLAYGROUND_NAME = 'Sân tập SumiTeX'
const OLD_SUFFIX = ' (cũ)'
const VERSION_LINE = /^%\s*Phiên bản sân tập:\s*(.+?)\s*$/m
const CACHE_MS = 60 * 1000

const isId = id => typeof id === 'string' && ObjectId.isValid(id)

// ---------------------------------------------------------------- settings

let cached = { at: 0, value: { guideProjectId: null, playgroundProjectId: null } }

/** Which projects are the handbook and the master playground, or nulls */
export async function guideSettings() {
  const fromEnv = {
    guideProjectId: process.env.SUMITEX_GUIDE_PROJECT_ID || null,
    playgroundProjectId: process.env.SUMITEX_PLAYGROUND_PROJECT_ID || null,
  }
  if (fromEnv.guideProjectId || fromEnv.playgroundProjectId) return fromEnv
  if (Date.now() - cached.at < CACHE_MS) return cached.value
  const settings = await getCollectionInternal('sumitexSettings')
  const doc = await settings.findOne({ _id: 'guide' })
  cached = {
    at: Date.now(),
    value: {
      guideProjectId: isId(doc?.guideProjectId) ? doc.guideProjectId : null,
      playgroundProjectId: isId(doc?.playgroundProjectId) ? doc.playgroundProjectId : null,
    },
  }
  return cached.value
}

// ------------------------------------------------------- handbook sharing

/**
 * Add the user to the handbook once: read-only, or as an editor when they
 * are a site admin. Never throws: signing in must not fail because of it.
 */
export async function ensureGuideMember(userId) {
  try {
    const { guideProjectId } = await guideSettings()
    if (!guideProjectId || !userId) return
    const members = await getCollectionInternal('sumitexGuideMembers')
    const key = { userId: String(userId), projectId: guideProjectId }
    if (await members.findOne(key)) return

    const project = await ProjectGetter.promises.getProject(guideProjectId, { owner_ref: 1 })
    if (!project) return
    const isOwner = String(project.owner_ref) === String(userId)
    const current = await CollaboratorsGetter.promises.getMemberIdPrivilegeLevel(
      userId,
      guideProjectId
    )
    if (!isOwner && !current) {
      const admin = await AuthorizationManager.promises.isUserSiteAdmin(userId)
      await CollaboratorsHandler.promises.addUserIdToProject(
        guideProjectId,
        project.owner_ref,
        userId,
        admin ? PrivilegeLevels.READ_AND_WRITE : PrivilegeLevels.READ_ONLY
      )
    }
    await members.updateOne(key, { $setOnInsert: { ...key, addedAt: new Date() } }, { upsert: true })
  } catch (error) {
    logger.warn({ err: error, userId }, 'SumiTeX: could not add the user to the guide')
  }
}

// --------------------------------------------------------------- playground

const versionCache = new Map()

/** The master playground's version line, from its main.tex */
export async function masterVersion(projectId) {
  const known = versionCache.get(projectId)
  if (known && Date.now() - known.at < CACHE_MS) return known.value
  let value = null
  try {
    // Edits an admin just made are still in the document updater
    await DocumentUpdaterHandler.promises.flushProjectToMongo(projectId)
    const docs = await ProjectEntityHandler.promises.getAllDocs(projectId)
    const main = docs['/main.tex'] ?? Object.values(docs)[0]
    value = main ? (VERSION_LINE.exec(main.lines.join('\n'))?.[1] ?? null) : null
  } catch (error) {
    logger.warn({ err: error, projectId }, 'SumiTeX: could not read the playground version')
  }
  versionCache.set(projectId, { at: Date.now(), value })
  return value
}

/** The user's playground record, if its project still exists and is theirs */
async function currentPlayground(userId) {
  const playgrounds = await getCollectionInternal('sumitexPlaygrounds')
  const record = await playgrounds.findOne({ userId: String(userId) })
  if (!record) return null
  const project = await ProjectGetter.promises.getProject(record.projectId, { owner_ref: 1 })
  if (!project || String(project.owner_ref) !== String(userId)) return null
  return record
}

/** What the page needs: the handbook, and the user's playground */
export async function guideInfo(userId) {
  const { guideProjectId, playgroundProjectId } = await guideSettings()
  if (!guideProjectId && !playgroundProjectId) return { enabled: false }
  if (guideProjectId) await ensureGuideMember(userId)
  const record = playgroundProjectId ? await currentPlayground(userId) : null
  const latest = playgroundProjectId ? await masterVersion(playgroundProjectId) : null
  return {
    enabled: true,
    guideProjectId,
    hasPlayground: Boolean(playgroundProjectId),
    playgroundProjectId: record?.projectId ?? null,
    outdated: Boolean(record && latest && record.version !== latest),
  }
}

/**
 * The user's playground: the existing one, or a new copy of the master.
 * With `fresh`, the old one is renamed "(cũ)" and a new copy is made.
 */
export async function openPlayground(userId, { fresh = false } = {}) {
  const { playgroundProjectId } = await guideSettings()
  if (!playgroundProjectId) throw new Error('The playground is not set up on this server')

  const existing = await currentPlayground(userId)
  if (existing && !fresh) return existing.projectId

  if (existing && fresh) {
    await ProjectDetailsHandler.promises.renameProject(
      existing.projectId,
      `${PLAYGROUND_NAME}${OLD_SUFFIX} ${new Date().toISOString().slice(0, 10)}`
    )
  }
  const owner = await UserGetter.promises.getUser(userId, { _id: 1, email: 1, first_name: 1, last_name: 1 })
  if (!owner) throw new Error('No such user')
  const project = await ProjectDuplicator.promises.duplicate(owner, playgroundProjectId, PLAYGROUND_NAME)
  const projectId = String(project._id)
  const playgrounds = await getCollectionInternal('sumitexPlaygrounds')
  await playgrounds.updateOne(
    { userId: String(userId) },
    {
      $set: {
        userId: String(userId),
        projectId,
        version: await masterVersion(playgroundProjectId),
        createdAt: new Date(),
      },
    },
    { upsert: true }
  )
  return projectId
}
