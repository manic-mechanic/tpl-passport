import { beforeEach, describe, expect, it, vi } from 'vitest'

const { reportError } = vi.hoisted(() => ({ reportError: vi.fn() }))
vi.mock('../app/lib/reportError', () => ({ reportError }))
vi.mock('../app/lib/config', () => ({ getAuthBase: () => 'https://auth.test' }))

// Module state (the once-only quota report) is per import, so load fresh.
async function load() {
  vi.resetModules()
  return await import('../app/lib/checkInPhoto')
}

function respond(status: number, body?: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })))
}

const blob = new Blob(['x'], { type: 'image/jpeg' })

beforeEach(() => {
  vi.unstubAllGlobals()
  reportError.mockClear()
})

describe('uploadCheckInPhotoResult', () => {
  it('returns the hosted URL', async () => {
    const { uploadCheckInPhotoResult, uploadCheckInPhoto } = await load()
    respond(200, { publicUrl: 'https://photos.test/photos/u1/a.jpg' })
    expect(await uploadCheckInPhotoResult(blob)).toEqual({ ok: true, url: 'https://photos.test/photos/u1/a.jpg' })
    expect(await uploadCheckInPhoto(blob)).toBe('https://photos.test/photos/u1/a.jpg')
  })

  it('tells the rate limit and a full account apart from a failure, without reporting them as errors', async () => {
    const { uploadCheckInPhotoResult } = await load()
    respond(401, { error: 'Unauthorized' })
    expect(await uploadCheckInPhotoResult(blob)).toEqual({ ok: false, reason: 'unauthorized' })
    respond(429, { error: 'Too many uploads', code: 'rate_limited' })
    expect(await uploadCheckInPhotoResult(blob)).toEqual({ ok: false, reason: 'rate_limited' })
    expect(reportError).not.toHaveBeenCalled()
  })

  it('reports a full account once, not on every retry', async () => {
    const { uploadCheckInPhotoResult } = await load()
    respond(507, { error: 'Photo limit reached', code: 'photo_quota' })
    expect(await uploadCheckInPhotoResult(blob)).toEqual({ ok: false, reason: 'quota' })
    expect(await uploadCheckInPhotoResult(blob)).toEqual({ ok: false, reason: 'quota' })
    expect(reportError).toHaveBeenCalledTimes(1)
  })

  it('reports other failures', async () => {
    const { uploadCheckInPhotoResult } = await load()
    respond(500, { error: 'x' })
    expect(await uploadCheckInPhotoResult(blob)).toEqual({ ok: false, reason: 'failed' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    expect(await uploadCheckInPhotoResult(blob)).toEqual({ ok: false, reason: 'failed' })
    expect(reportError).toHaveBeenCalledTimes(2)
  })
})
