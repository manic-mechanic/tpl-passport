import { describe, expect, it } from 'vitest'
import { eventsCacheControl } from '../server/lib/ckanEvents'

// Toronto is UTC-5 in November, so midnight on Nov 19 is 05:00 UTC.
const at = (iso: string) => new Date(iso)

describe('eventsCacheControl', () => {
  it('lets the CDN keep a complete response for 15 minutes, plus 5 stale', () => {
    expect(eventsCacheControl(true, at('2026-11-18T20:00:00Z')))
      .toBe('public, max-age=0, s-maxage=900, stale-while-revalidate=300')
  })

  it('never caches a response that is missing a day', () => {
    expect(eventsCacheControl(false, at('2026-11-18T20:00:00Z'))).toBe('no-store')
  })

  it('stops the cached copy at Toronto midnight, since "today" changes then', () => {
    // 23:50 Toronto: 10 minutes left, so no stale window either.
    expect(eventsCacheControl(true, at('2026-11-19T04:50:00Z')))
      .toBe('public, max-age=0, s-maxage=600')
    // 23:42 Toronto: 18 minutes left, 15 fresh and 3 stale.
    expect(eventsCacheControl(true, at('2026-11-19T04:42:00Z')))
      .toBe('public, max-age=0, s-maxage=900, stale-while-revalidate=180')
    // The last second of the day isn't cached.
    expect(eventsCacheControl(true, at('2026-11-19T04:59:59.500Z'))).toBe('no-store')
  })
})

describe('branch codes to feed names', () => {
  it('maps codes to the names the feed uses, straight apostrophe included', async () => {
    const { feedNamesForCodes } = await import('../server/lib/ckanEvents')
    const names = feedNamesForCodes('we, LB,zzz,WE')
    expect(names).toEqual(['Long Branch', 'Weston'])
    expect(feedNamesForCodes('')).toEqual([])
  })
})

describe('branch code limits', () => {
  it('refuses more branches than a district rather than cutting the list', async () => {
    const { feedNamesForCodes, MAX_BRANCHES } = await import('../server/lib/ckanEvents')
    const { physicalBranches } = await import('@tpl-passport/shared')
    const codes = physicalBranches.map(b => b.BranchCode)
    expect(feedNamesForCodes(codes.slice(0, MAX_BRANCHES).join(','))).toHaveLength(MAX_BRANCHES)
    expect(feedNamesForCodes(codes.slice(0, MAX_BRANCHES + 1).join(','))).toBeNull()
  })
})
