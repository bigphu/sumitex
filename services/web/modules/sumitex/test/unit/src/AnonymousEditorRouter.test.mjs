import { describe, it, expect, vi } from 'vitest'
import AnonymousEditorRouter, {
  completeAnonymousSettings,
  noLastUpdaterForAnonymous,
  withAnonymousDefaults,
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
    AnonymousEditorRouter.applyNonCsrfRouter({ get: vi.fn() }, privateApiRouter)
    expect(privateApiRouter.post).toHaveBeenCalledWith(
      '/project/:Project_id/doc/:doc_id',
      noLastUpdaterForAnonymous
    )
  })

  describe('the editor settings of a visitor with no account', function () {
    it('turns the equation preview on when Overleaf left it out', function () {
      expect(withAnonymousDefaults({ mode: 'none' })).toEqual({
        mode: 'none',
        mathPreview: true,
      })
      expect(withAnonymousDefaults({ mathPreview: undefined }).mathPreview).toBe(
        true
      )
    })

    it('keeps a value that is there', function () {
      expect(withAnonymousDefaults({ mathPreview: false }).mathPreview).toBe(
        false
      )
    })

    const renderThrough = options => {
      const calls = []
      const res = { render: (...args) => calls.push(args) }
      const next = vi.fn()
      completeAnonymousSettings({}, res, next)
      res.render('project/ide-react', options)
      return { calls, next }
    }

    it('completes the settings the editor page is rendered with', function () {
      const { calls, next } = renderThrough({
        anonymous: true,
        userSettings: { mode: 'none' },
      })
      expect(next).toHaveBeenCalledOnce()
      expect(calls[0][0]).toBe('project/ide-react')
      expect(calls[0][1].userSettings.mathPreview).toBe(true)
    })

    it('leaves a signed-in visitor, and other pages, alone', function () {
      const signedIn = { anonymous: false, userSettings: { mathPreview: false } }
      expect(renderThrough(signedIn).calls[0][1].userSettings.mathPreview).toBe(
        false
      )
      expect(renderThrough({ anonymous: true }).calls[0][1]).toEqual({
        anonymous: true,
      })
    })
  })
})
