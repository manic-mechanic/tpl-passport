import { beforeEach, describe, expect, it, vi } from 'vitest'

const { reportError, uploadCheckInPhotoResult } = vi.hoisted(() => ({
  reportError: vi.fn(),
  uploadCheckInPhotoResult: vi.fn(),
}))
vi.mock('../app/lib/reportError', () => ({ reportError }))
vi.mock('../app/lib/checkInPhoto', () => ({ uploadCheckInPhotoResult }))

const { backUpVisitPhoto, photoBackupInFlight, isShareCancel, savePhotoToDevice, uploadFailureText, visitPath } = await import('../app/lib/visitPhoto')

const blob = new Blob(['x'], { type: 'image/jpeg' })
const ts = '2026-11-22T15:04:05.123Z'

beforeEach(() => {
  vi.unstubAllGlobals()
  reportError.mockClear()
  uploadCheckInPhotoResult.mockReset()
})

describe('visitPath', () => {
  it('is the check-in timestamp, encoded, and round-trips', () => {
    expect(visitPath(ts)).toBe('/visit/2026-11-22T15%3A04%3A05.123Z')
    expect(decodeURIComponent(visitPath(ts).slice('/visit/'.length))).toBe(ts)
  })
})

describe('backUpVisitPhoto', () => {
  it('uploads, then saves the hosted URL on the check-in', async () => {
    uploadCheckInPhotoResult.mockResolvedValue({ ok: true, url: 'https://photos.test/a.jpg' })
    const markHosted = vi.fn(async () => true)
    expect(await backUpVisitPhoto(ts, blob, markHosted)).toEqual({ state: 'uploaded' })
    expect(markHosted).toHaveBeenCalledWith(ts, 'https://photos.test/a.jpg')
  })

  it('reports the upload failure reason and leaves the check-in alone', async () => {
    uploadCheckInPhotoResult.mockResolvedValue({ ok: false, reason: 'quota' })
    const markHosted = vi.fn(async () => true)
    expect(await backUpVisitPhoto(ts, blob, markHosted)).toEqual({ state: 'failed', reason: 'quota' })
    expect(markHosted).not.toHaveBeenCalled()
  })

  it('fails as patch when the server does not take the URL', async () => {
    uploadCheckInPhotoResult.mockResolvedValue({ ok: true, url: 'https://photos.test/a.jpg' })
    expect(await backUpVisitPhoto(ts, blob, async () => false)).toEqual({ state: 'failed', reason: 'patch' })
  })

  it('with a hosted URL already, only saves the URL again', async () => {
    const markHosted = vi.fn(async () => true)
    expect(await backUpVisitPhoto(ts, null, markHosted, 'https://photos.test/a.jpg')).toEqual({ state: 'uploaded' })
    expect(uploadCheckInPhotoResult).not.toHaveBeenCalled()
  })

  it('fails without a photo to upload', async () => {
    expect(await backUpVisitPhoto(ts, null, async () => true)).toEqual({ state: 'failed', reason: 'failed' })
  })

  it('a newer photo overtakes an earlier upload, which then saves nothing', async () => {
    let finishFirst: (v: unknown) => void = () => {}
    uploadCheckInPhotoResult
      .mockImplementationOnce(() => new Promise(r => { finishFirst = r }))
      .mockResolvedValueOnce({ ok: true, url: 'https://photos.test/b.jpg' })
    const markHosted = vi.fn(async () => true)
    const first = backUpVisitPhoto(ts, blob, markHosted)
    const second = backUpVisitPhoto(ts, blob, markHosted)
    expect(await second).toEqual({ state: 'uploaded' })
    finishFirst({ ok: true, url: 'https://photos.test/a.jpg' })
    expect(await first).toEqual({ state: 'superseded' })
    expect(markHosted).toHaveBeenCalledTimes(1)
    expect(markHosted).toHaveBeenCalledWith(ts, 'https://photos.test/b.jpg')
  })

  it('lets another caller wait for a backup in flight', async () => {
    uploadCheckInPhotoResult.mockResolvedValue({ ok: false, reason: 'rate_limited' })
    expect(photoBackupInFlight(ts)).toBeNull()
    const run = backUpVisitPhoto(ts, blob, async () => true)
    const waiting = photoBackupInFlight(ts)
    expect(waiting).not.toBeNull()
    expect(await waiting).toEqual({ state: 'failed', reason: 'rate_limited' })
    await run
    expect(photoBackupInFlight(ts)).toBeNull()
  })
})

describe('uploadFailureText', () => {
  it('has a message for each reason', () => {
    for (const reason of ['unauthorized', 'rate_limited', 'quota', 'failed', 'patch'] as const) {
      expect(uploadFailureText(reason)).toMatch(/\S/)
    }
  })
})

describe('savePhotoToDevice', () => {
  function stubDom() {
    const click = vi.fn()
    vi.stubGlobal('document', { createElement: () => ({ click, href: '', download: '' }) })
    vi.stubGlobal('URL', Object.assign(globalThis.URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }))
    return click
  }

  it('shares the photo when files can be shared', async () => {
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', { canShare: () => true, share })
    expect(await savePhotoToDevice(blob)).toBe('shared')
    expect(share).toHaveBeenCalledOnce()
  })

  it('treats a closed share sheet as a cancel, not an error', async () => {
    const click = stubDom()
    vi.stubGlobal('navigator', { canShare: () => true, share: async () => { throw new DOMException('Share canceled', 'AbortError') } })
    expect(await savePhotoToDevice(blob)).toBe('cancelled')
    expect(reportError).not.toHaveBeenCalled()
    expect(click).not.toHaveBeenCalled()
  })

  it('reports other share failures and falls back to a download', async () => {
    const click = stubDom()
    vi.stubGlobal('navigator', { canShare: () => true, share: async () => { throw new DOMException('no activation', 'NotAllowedError') } })
    expect(await savePhotoToDevice(blob)).toBe('downloaded')
    expect(reportError).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
  })

  it('downloads where files cannot be shared', async () => {
    const click = stubDom()
    vi.stubGlobal('navigator', {})
    expect(await savePhotoToDevice(blob)).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })

  it('knows a cancel when it sees one', () => {
    expect(isShareCancel(new DOMException('x', 'AbortError'))).toBe(true)
    expect(isShareCancel(new Error('x'))).toBe(false)
    expect(isShareCancel(null)).toBe(false)
  })
})
