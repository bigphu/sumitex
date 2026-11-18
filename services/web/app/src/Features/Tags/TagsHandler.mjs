import { Tag } from '../../models/Tag.mjs'
import { callbackify } from '@overleaf/promise-utils'
import Errors from '../Errors/Errors.js'

const MAX_TAG_LENGTH = 50

// SumiTeX: folders nest (a tag's parent_id), at most this many levels deep
export const MAX_FOLDER_DEPTH = 5

// tag id → parent id (null at the top), for one user
async function _folderParents(userId) {
  const tags = await Tag.find({ user_id: userId }, { parent_id: 1 }).lean()
  return new Map(tags.map(tag => [tag._id.toString(), tag.parent_id || null]))
}

// 1 for a top-level folder; a parent that no longer exists counts as the top
function _depth(parents, id) {
  let depth = 0
  for (let cur = id; cur && parents.has(cur) && depth <= parents.size; ) {
    depth++
    cur = parents.get(cur)
  }
  return depth
}

// How many levels a folder and everything inside it take up
function _height(parents, id) {
  const children = [...parents].filter(([, parent]) => parent === id)
  return 1 + Math.max(0, ...children.map(([child]) => _height(parents, child)))
}

/**
 * Throws when `tagId` (or a new folder, when null) can't go inside
 * `parentId`: the parent isn't one of the user's folders, the move would put
 * a folder inside itself, or the tree would get too deep.
 */
async function _checkParent(userId, tagId, parentId) {
  if (!parentId) return
  const parents = await _folderParents(userId)
  if (!parents.has(parentId)) {
    throw new Errors.NotFoundError('folder not found')
  }
  for (let cur = parentId, steps = 0; cur; cur = parents.get(cur), steps++) {
    if (cur === tagId) {
      throw new Errors.InvalidError('A folder cannot go inside itself')
    }
    if (steps > parents.size) break
  }
  const height = tagId ? _height(parents, tagId) : 1
  if (_depth(parents, parentId) + height > MAX_FOLDER_DEPTH) {
    throw new Errors.InvalidError(
      `Folders can be at most ${MAX_FOLDER_DEPTH} levels deep`
    )
  }
}

async function getAllTags(userId) {
  return Tag.find({ user_id: userId })
}

async function countTagsForProject(userId, projectId) {
  return Tag.countDocuments({ user_id: userId, project_ids: projectId })
}

async function getTagsForProject(userId, projectId) {
  return Tag.find({ user_id: userId, project_ids: projectId }, '-project_ids')
}

async function createTag(userId, name, color, options = {}) {
  if (name.length > MAX_TAG_LENGTH) {
    if (options.truncate) {
      name = name.slice(0, MAX_TAG_LENGTH)
    } else {
      throw new Error('Exceeded max tag length')
    }
  }
  // SumiTeX: a new folder may go inside another
  const parentId = options.parentId || null
  await _checkParent(userId, null, parentId)
  try {
    return await Tag.create({
      user_id: userId,
      name,
      color,
      ...(parentId ? { parent_id: parentId } : {}),
    })
  } catch (error) {
    // on duplicate key error return existing tag
    if (error && error.code === 11000) {
      return Tag.findOne({ user_id: userId, name })
    }
    throw error
  }
}

async function renameTag(userId, tagId, name) {
  if (name.length > MAX_TAG_LENGTH) {
    throw new Error('Exceeded max tag length')
  }
  return Tag.updateOne(
    {
      _id: tagId,
      user_id: userId,
    },
    {
      $set: {
        name,
      },
    }
  )
}

async function editTag(userId, tagId, name, color) {
  if (name.length > MAX_TAG_LENGTH) {
    throw new Error('Exceeded max tag length')
  }
  return Tag.updateOne(
    {
      _id: tagId,
      user_id: userId,
    },
    {
      $set: {
        name,
        color,
      },
    }
  )
}

// SumiTeX: move a folder inside another, or to the top (parentId null)
async function moveTag(userId, tagId, parentId) {
  const tag = await Tag.findOne({ _id: tagId, user_id: userId }, { _id: 1 })
  if (!tag) {
    throw new Errors.NotFoundError('folder not found')
  }
  await _checkParent(userId, tagId, parentId)
  await Tag.updateOne(
    { _id: tagId, user_id: userId },
    parentId ? { $set: { parent_id: parentId } } : { $unset: { parent_id: 1 } }
  )
}

async function deleteTag(userId, tagId) {
  // SumiTeX: the folders inside move up a level
  const tag = await Tag.findOne(
    { _id: tagId, user_id: userId },
    { parent_id: 1 }
  )
  if (tag) {
    await Tag.updateMany(
      { user_id: userId, parent_id: tagId.toString() },
      tag.parent_id
        ? { $set: { parent_id: tag.parent_id } }
        : { $unset: { parent_id: 1 } }
    )
  }
  await Tag.deleteOne({
    _id: tagId,
    user_id: userId,
  })
}

async function removeProjectFromTag(userId, tagId, projectId) {
  const searchOps = {
    _id: tagId,
    user_id: userId,
  }
  const deleteOperation = { $pull: { project_ids: projectId } }
  await Tag.updateOne(searchOps, deleteOperation)
}

async function removeProjectsFromTag(userId, tagId, projectIds) {
  const searchOps = {
    _id: tagId,
    user_id: userId,
  }
  const deleteOperation = { $pullAll: { project_ids: projectIds } }
  await Tag.updateOne(searchOps, deleteOperation)
}

async function addProjectToTag(userId, tagId, projectId) {
  const searchOps = {
    _id: tagId,
    user_id: userId,
  }
  const insertOperation = { $addToSet: { project_ids: projectId } }
  return Tag.findOneAndUpdate(searchOps, insertOperation)
}

async function addProjectsToTag(userId, tagId, projectIds) {
  const searchOps = {
    _id: tagId,
    user_id: userId,
  }
  const insertOperation = { $addToSet: { project_ids: { $each: projectIds } } }
  await Tag.findOneAndUpdate(searchOps, insertOperation)
}

async function addProjectToTagName(userId, name, projectId) {
  const searchOps = {
    name,
    user_id: userId,
  }
  const insertOperation = { $addToSet: { project_ids: projectId } }
  await Tag.updateOne(searchOps, insertOperation, { upsert: true })
}

async function removeProjectFromAllTags(userId, projectId) {
  const searchOps = { user_id: userId }
  const deleteOperation = { $pull: { project_ids: projectId } }
  await Tag.updateMany(searchOps, deleteOperation)
}

async function addProjectToTags(userId, tagIds, projectId) {
  const searchOps = { user_id: userId, _id: { $in: tagIds } }
  const insertOperation = { $addToSet: { project_ids: projectId } }
  await Tag.updateMany(searchOps, insertOperation)
}

export default {
  getAllTags: callbackify(getAllTags),
  countTagsForProject: callbackify(countTagsForProject),
  getTagsForProject: callbackify(getTagsForProject),
  createTag: callbackify(createTag),
  renameTag: callbackify(renameTag),
  editTag: callbackify(editTag),
  deleteTag: callbackify(deleteTag),
  moveTag: callbackify(moveTag),
  addProjectToTag: callbackify(addProjectToTag),
  addProjectsToTag: callbackify(addProjectsToTag),
  addProjectToTags: callbackify(addProjectToTags),
  removeProjectFromTag: callbackify(removeProjectFromTag),
  removeProjectsFromTag: callbackify(removeProjectsFromTag),
  addProjectToTagName: callbackify(addProjectToTagName),
  removeProjectFromAllTags: callbackify(removeProjectFromAllTags),
  promises: {
    getAllTags,
    countTagsForProject,
    getTagsForProject,
    createTag,
    renameTag,
    editTag,
    deleteTag,
    moveTag,
    addProjectToTag,
    addProjectsToTag,
    addProjectToTags,
    removeProjectFromTag,
    removeProjectsFromTag,
    addProjectToTagName,
    removeProjectFromAllTags,
  },
}
