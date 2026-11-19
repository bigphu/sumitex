import { describe, it, expect, vi } from 'vitest'
import AnonymousEditorRouter, {
  noLastUpdaterForAnonymous,
} from '../../../app/src/AnonymousEditorRouter.mjs'

const run = body => {
  const req = { body }
  const next = vi.fn()
  noLastUpdaterForAnonymous(req, {}, next)
  return { req, next }
}

describe('AnonymousEditorRouter', function () {
  it("reports no last updater for the 'anonymous-user' sentinel", function () {
    const { req, next } = run({ lines: ['a'], lastUpdatedBy: 'anonymous-user' })
    expect(req.body.lastUpdatedBy).toBe(null)
    expect(req.body.lines).toEqual(['a'])
    expect(next).toHaveBeenCalledOnce()
  })

  it('leaves a real user id alone', function () {
    const id = '5c9a5d5b0000000000000003'
    expect(run({ lastUpdatedBy: id }).req.body.lastUpdatedBy).toBe(id)
  })

  it('leaves a missing or empty last updater alone', function () {
    expect('lastUpdatedBy' in run({ lines: [] }).req.body).toBe(false)
    expect(run({ lastUpdatedBy: null }).req.body.lastUpdatedBy).toBe(null)
  })

  it('copes with a request that has no body', function () {
    const { next } = run(undefined)
    expect(next).toHaveBeenCalledOnce()
  })

  it("is registered on the document save route, before Overleaf's own", function () {
    const privateApiRouter = { post: vi.fn() }
    AnonymousEditorRouter.applyNonCsrfRouter({}, privateApiRouter)
    expect(privateApiRouter.post).toHaveBeenCalledWith(
      '/project/:Project_id/doc/:doc_id',
      noLastUpdaterForAnonymous
    )
  })
})
