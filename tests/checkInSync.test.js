import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../app/lib/reportError', () => ({ reportError: vi.fn() }))
vi.mock('../app/lib/config', () => ({ getAuthBase: () => 'https://auth.test' }))

import { pushCheckIn } from '../app/composables/useCheckInSync'

const checkIn = { branchCode: 'AN', timestamp: '2026-11-15T01:00:00.000Z', note: '' }

function respond(status, body) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })))
}

beforeEach(() => vi.unstubAllGlobals())

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
