import { describe, it, expect, vi, beforeEach } from 'vitest'

const { reportError } = vi.hoisted(() => ({ reportError: vi.fn() }))
vi.mock('../app/lib/reportError', () => ({ reportError }))
vi.mock('../app/lib/config', () => ({ getAuthBase: () => 'https://auth.test' }))

import { fetchCheckIns, pushCheckIn } from '../app/composables/useCheckInSync'

const checkIn = { branchCode: 'AN', timestamp: '2026-11-15T01:00:00.000Z', note: '' }

function respond(status, body) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })))
}

beforeEach(() => {
  vi.unstubAllGlobals()
  reportError.mockClear()
})

describe('pushCheckIn', () => {
  it('resolves true when the server saved the check-in', async () => {
    respond(200, { ok: true })
    expect(await pushCheckIn(checkIn)).toBe(true)
  })

  it('resolves false when another check-in already holds the branch and day', async () => {
    respond(200, { ok: true, duplicateOf: '2026-11-14T14:00:00.000Z' })
    expect(await pushCheckIn(checkIn)).toBe(false)
  })

  it('resolves true for an older server that sends no body', async () => {
    respond(200)
    expect(await pushCheckIn(checkIn)).toBe(true)
  })

  it('resolves false on an HTTP error', async () => {
    respond(500, { error: 'x' })
    expect(await pushCheckIn(checkIn)).toBe(false)
  })
})

describe('fetchCheckIns', () => {
  it('maps the server records', async () => {
    respond(200, [{ branch_code: 'AN', timestamp: '2026-11-15T01:00:00.000Z', note: null, photo_url: 'https://p.test/a.jpg' }])
    expect(await fetchCheckIns()).toEqual([
      { branchCode: 'AN', timestamp: '2026-11-15T01:00:00.000Z', note: '', photoUri: 'https://p.test/a.jpg', hasPhoto: true },
    ])
    expect(reportError).not.toHaveBeenCalled()
  })

  it('drops malformed records and reports them once', async () => {
    respond(200, [
      { branch_code: 'AN', timestamp: '2026-11-15T01:00:00.000Z' },
      { branch_code: 'BE' },
      { timestamp: '2026-11-15T02:00:00.000Z' },
    ])
    expect(await fetchCheckIns()).toEqual([{ branchCode: 'AN', timestamp: '2026-11-15T01:00:00.000Z', note: '' }])
    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError.mock.calls[0][1]).toMatchObject({ operation: 'fetch_checkins', dropped: 2 })
  })

  it('resolves null for a body that is not a list', async () => {
    respond(200, { error: 'x' })
    expect(await fetchCheckIns()).toBeNull()
    expect(reportError).toHaveBeenCalledTimes(1)
  })
})
