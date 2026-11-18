import { beforeEach, describe, expect, it, vi } from 'vitest'
import sinon from 'sinon'
import mongodb from 'mongodb-legacy'
import path from 'node:path'
import { Tag } from '../../../../app/src/models/Tag.mjs'
const { ObjectId } = mongodb

const modulePath = path.join(
  import.meta.dirname,
  '../../../../app/src/Features/Tags/TagsHandler.mjs'
)

describe('TagsHandler', function () {
  beforeEach(async function (ctx) {
    ctx.userId = new ObjectId().toString()
    ctx.callback = sinon.stub()

    ctx.tag = { user_id: ctx.userId, name: 'some name', color: '#3399CC' }
    ctx.tagId = new ObjectId().toString()
    ctx.projectId = new ObjectId().toString()
    ctx.projectIds = [new ObjectId().toString(), new ObjectId().toString()]

    ctx.mongodb = { ObjectId }
    ctx.TagMock = sinon.mock(Tag)

    vi.doMock('../../../../app/src/infrastructure/mongodb', () => ({
      default: ctx.mongodb,
    }))

    vi.doMock('../../../../app/src/models/Tag', () => ({
      Tag,
    }))

    ctx.TagsHandler = (await import(modulePath)).default
  })

  describe('finding users tags', function () {
    it('should find all the documents with that user id', async function (ctx) {
      const stubbedTags = [{ name: 'tag1' }, { name: 'tag2' }, { name: 'tag3' }]
      ctx.TagMock.expects('find')
        .once()
        .withArgs({ user_id: ctx.userId })
        .resolves(stubbedTags)
      const result = await ctx.TagsHandler.promises.getAllTags(ctx.userId)
      ctx.TagMock.verify()
      expect(result).to.deep.equal(stubbedTags)
    })
  })

  describe('createTag', function () {
    describe('when insert succeeds', function () {
      it('should call insert in mongo', async function (ctx) {
        ctx.TagMock.expects('create').withArgs(ctx.tag).once().resolves(ctx.tag)
        const resultTag = await ctx.TagsHandler.promises.createTag(
          ctx.tag.user_id,
          ctx.tag.name,
          ctx.tag.color
        )
        ctx.TagMock.verify()
        expect(resultTag.user_id).to.equal(ctx.tag.user_id)
        expect(resultTag.name).to.equal(ctx.tag.name)
        expect(resultTag.color).to.equal(ctx.tag.color)
      })
    })

    describe('when truncate=true, and tag is too long', function () {
      it('should truncate the tag name', async function (ctx) {
        // Expect the tag to end up with this truncated name
        ctx.tag.name = 'a comically long tag that will be truncated intern'
        ctx.TagMock.expects('create').withArgs(ctx.tag).once().resolves(ctx.tag)
        const resultTag = await ctx.TagsHandler.promises.createTag(
          ctx.tag.user_id,
          // Pass this too-long name
          'a comically long tag that will be truncated internally and not throw an error',
          ctx.tag.color,
          { truncate: true }
        )
        expect(resultTag.name).to.equal(ctx.tag.name)
      })
    })

    describe('when tag is too long', function () {
      it('should throw an error', async function (ctx) {
        let error

        try {
          await ctx.TagsHandler.promises.createTag(
            ctx.tag.user_id,
            'this is a tag that is very very very very very very long',
            undefined
          )
        } catch (err) {
          error = err
        }

        expect(error).to.exist
        expect(error).to.have.property('message', 'Exceeded max tag length')
      })
    })

    describe('when insert has duplicate key error error', function () {
      beforeEach(function (ctx) {
        ctx.duplicateKeyError = new Error('Duplicate')
        ctx.duplicateKeyError.code = 11000
      })

      it('should get tag with findOne and return that tag', async function (ctx) {
        ctx.TagMock.expects('create')
          .withArgs(ctx.tag)
          .once()
          .throws(ctx.duplicateKeyError)
        ctx.TagMock.expects('findOne')
          .withArgs({ user_id: ctx.tag.user_id, name: ctx.tag.name })
          .once()
          .resolves(ctx.tag)
        const resultTag = await ctx.TagsHandler.promises.createTag(
          ctx.tag.user_id,
          ctx.tag.name,
          ctx.tag.color
        )
        ctx.TagMock.verify()
        expect(resultTag.user_id).to.equal(ctx.tag.user_id)
        expect(resultTag.name).to.equal(ctx.tag.name)
        expect(resultTag.color).to.equal(ctx.tag.color)
      })
    })
  })

  describe('addProjectToTag', function () {
    describe('with a valid tag_id', function () {
      it('should call update in mongo', async function (ctx) {
        ctx.TagMock.expects('findOneAndUpdate')
          .once()
          .withArgs(
            { _id: ctx.tagId, user_id: ctx.userId },
            { $addToSet: { project_ids: ctx.projectId } }
          )
          .resolves()
        await ctx.TagsHandler.promises.addProjectToTag(
          ctx.userId,
          ctx.tagId,
          ctx.projectId
        )
        ctx.TagMock.verify()
      })
    })
  })

  describe('addProjectsToTag', function () {
    describe('with a valid tag_id', function () {
      it('should call update in mongo', async function (ctx) {
        ctx.TagMock.expects('findOneAndUpdate')
          .once()
          .withArgs(
            { _id: ctx.tagId, user_id: ctx.userId },
            { $addToSet: { project_ids: { $each: ctx.projectIds } } }
          )
          .resolves()
        await ctx.TagsHandler.promises.addProjectsToTag(
          ctx.userId,
          ctx.tagId,
          ctx.projectIds
        )
        ctx.TagMock.verify()
      })
    })
  })

  describe('addProjectToTagName', function () {
    it('should call update in mongo', async function (ctx) {
      ctx.TagMock.expects('updateOne')
        .once()
        .withArgs(
          { name: ctx.tag.name, user_id: ctx.tag.userId },
          { $addToSet: { project_ids: ctx.projectId } },
          { upsert: true }
        )
        .resolves()
      await ctx.TagsHandler.promises.addProjectToTagName(
        ctx.tag.userId,
        ctx.tag.name,
        ctx.projectId
      )
      ctx.TagMock.verify()
    })
  })

  describe('removeProjectFromTag', function () {
    describe('with a valid tag_id', function () {
      it('should call update in mongo', async function (ctx) {
        ctx.TagMock.expects('updateOne')
          .once()
          .withArgs(
            {
              _id: ctx.tagId,
              user_id: ctx.userId,
            },
            {
              $pull: { project_ids: ctx.projectId },
            }
          )
          .resolves()
        await ctx.TagsHandler.promises.removeProjectFromTag(
          ctx.userId,
          ctx.tagId,
          ctx.projectId
        )

        ctx.TagMock.verify()
      })
    })
  })

  describe('removeProjectsFromTag', function () {
    describe('with a valid tag_id', function () {
      it('should call update in mongo', async function (ctx) {
        ctx.TagMock.expects('updateOne')
          .once()
          .withArgs(
            {
              _id: ctx.tagId,
              user_id: ctx.userId,
            },
            {
              $pullAll: { project_ids: ctx.projectIds },
            }
          )
          .resolves()
        await ctx.TagsHandler.promises.removeProjectsFromTag(
          ctx.userId,
          ctx.tagId,
          ctx.projectIds
        )
        ctx.TagMock.verify()
      })
    })
  })

  describe('removeProjectFromAllTags', function () {
    it('should pull the project id from the tag', async function (ctx) {
      ctx.TagMock.expects('updateMany')
        .once()
        .withArgs(
          {
            user_id: ctx.userId,
          },
          {
            $pull: { project_ids: ctx.projectId },
          }
        )
        .resolves()
      await ctx.TagsHandler.promises.removeProjectFromAllTags(
        ctx.userId,
        ctx.projectId
      )
      ctx.TagMock.verify()
    })
  })

  describe('addProjectToTags', function () {
    it('should add the project id to each tag', async function (ctx) {
      const tagIds = []

      ctx.TagMock.expects('updateMany')
        .once()
        .withArgs(
          {
            user_id: ctx.userId,
            _id: { $in: tagIds },
          },
          {
            $addToSet: { project_ids: ctx.projectId },
          }
        )
        .resolves()
      await ctx.TagsHandler.promises.addProjectToTags(
        ctx.userId,
        tagIds,
        ctx.projectId
      )
      ctx.TagMock.verify()
    })
  })

  describe('deleteTag', function () {
    describe('with a valid tag_id', function () {
      it('should call remove in mongo', async function (ctx) {
        ctx.TagMock.expects('findOne').once().resolves({})
        ctx.TagMock.expects('updateMany')
          .once()
          .withArgs(
            { user_id: ctx.userId, parent_id: ctx.tagId },
            { $unset: { parent_id: 1 } }
          )
          .resolves()
        ctx.TagMock.expects('deleteOne')
          .once()
          .withArgs({ _id: ctx.tagId, user_id: ctx.userId })
          .resolves()
        await ctx.TagsHandler.promises.deleteTag(ctx.userId, ctx.tagId)
        ctx.TagMock.verify()
      })
    })
  })

  describe('renameTag', function () {
    describe('with a valid tag_id', function () {
      it('should call remove in mongo', async function (ctx) {
        ctx.newName = 'new name'
        ctx.TagMock.expects('updateOne')
          .once()
          .withArgs(
            { _id: ctx.tagId, user_id: ctx.userId },
            { $set: { name: ctx.newName } }
          )
          .resolves()
        await ctx.TagsHandler.promises.renameTag(
          ctx.userId,
          ctx.tagId,
          ctx.newName
        )
        ctx.TagMock.verify()
      })
    })

    describe('when tag is too long', function () {
      it('should throw an error', async function (ctx) {
        let error

        try {
          await ctx.TagsHandler.promises.renameTag(
            ctx.userId,
            ctx.tagId,
            'this is a tag that is very very very very very very long'
          )
        } catch (err) {
          error = err
        }

        expect(error).to.exist
        expect(error).to.have.property('message', 'Exceeded max tag length')
      })
    })
  })
  // SumiTeX: folders nest through parent_id
  describe('folders', function () {
    // a → b → c → d (each inside the one before), e on its own
    const ids = {}
    beforeEach(function () {
      for (const name of ['a', 'b', 'c', 'd', 'e']) {
        ids[name] = new ObjectId().toString()
      }
    })
    const tree = () => [
      { _id: ids.a, parent_id: null },
      { _id: ids.b, parent_id: ids.a },
      { _id: ids.c, parent_id: ids.b },
      { _id: ids.d, parent_id: ids.c },
      { _id: ids.e },
    ]
    const findReturns = (ctx, tags) =>
      ctx.TagMock.expects('find').returns({
        lean: () => Promise.resolve(tags),
      })

    it('creates a folder inside another', async function (ctx) {
      findReturns(ctx, tree())
      ctx.TagMock.expects('create')
        .once()
        .withArgs({
          user_id: ctx.userId,
          name: 'inside',
          color: undefined,
          parent_id: ids.a,
        })
        .resolves({ name: 'inside' })
      await ctx.TagsHandler.promises.createTag(
        ctx.userId,
        'inside',
        undefined,
        {
          parentId: ids.a,
        }
      )
      ctx.TagMock.verify()
    })

    it('rejects a parent that is not one of the user’s folders', async function (ctx) {
      findReturns(ctx, tree())
      const error = await ctx.TagsHandler.promises
        .createTag(ctx.userId, 'x', undefined, {
          parentId: new ObjectId().toString(),
        })
        .catch(e => e)
      expect(error.message).to.contain('folder not found')
    })

    it('rejects a new folder past five levels', async function (ctx) {
      const deep = [...tree(), { _id: ids.e, parent_id: ids.d }]
      findReturns(ctx, deep)
      const error = await ctx.TagsHandler.promises
        .createTag(ctx.userId, 'x', undefined, {
          parentId: ids.e,
        })
        .catch(e => e)
      expect(error.message).to.contain('at most 5 levels')
    })

    it('rejects moving a folder inside itself or its own subfolder', async function (ctx) {
      ctx.TagMock.expects('findOne').resolves({ _id: ids.b })
      findReturns(ctx, tree())
      const error = await ctx.TagsHandler.promises
        .moveTag(ctx.userId, ids.b, ids.d)
        .catch(e => e)
      expect(error.message).to.contain('inside itself')
    })

    it('rejects a move that makes the tree too deep', async function (ctx) {
      // e holds a three-level subtree; under d (level 4) it would reach 7
      const tags = [
        ...tree(),
        { _id: 'f', parent_id: ids.e },
        { _id: 'g', parent_id: 'f' },
      ]
      ctx.TagMock.expects('findOne').resolves({ _id: ids.e })
      findReturns(ctx, tags)
      const error = await ctx.TagsHandler.promises
        .moveTag(ctx.userId, ids.e, ids.d)
        .catch(e => e)
      expect(error.message).to.contain('at most 5 levels')
    })

    it('moves a folder inside another', async function (ctx) {
      ctx.TagMock.expects('findOne').resolves({ _id: ids.e })
      findReturns(ctx, tree())
      ctx.TagMock.expects('updateOne')
        .once()
        .withArgs(
          { _id: ids.e, user_id: ctx.userId },
          { $set: { parent_id: ids.a } }
        )
        .resolves()
      await ctx.TagsHandler.promises.moveTag(ctx.userId, ids.e, ids.a)
      ctx.TagMock.verify()
    })

    it('moves a folder to the top', async function (ctx) {
      ctx.TagMock.expects('findOne').resolves({ _id: ids.c })
      ctx.TagMock.expects('updateOne')
        .once()
        .withArgs(
          { _id: ids.c, user_id: ctx.userId },
          { $unset: { parent_id: 1 } }
        )
        .resolves()
      await ctx.TagsHandler.promises.moveTag(ctx.userId, ids.c, null)
      ctx.TagMock.verify()
    })

    it('moves the folders inside a deleted one up a level', async function (ctx) {
      ctx.TagMock.expects('findOne').resolves({ parent_id: ids.a })
      ctx.TagMock.expects('updateMany')
        .once()
        .withArgs(
          { user_id: ctx.userId, parent_id: ids.b },
          { $set: { parent_id: ids.a } }
        )
        .resolves()
      ctx.TagMock.expects('deleteOne').once().resolves()
      await ctx.TagsHandler.promises.deleteTag(ctx.userId, ids.b)
      ctx.TagMock.verify()
    })
  })
})
