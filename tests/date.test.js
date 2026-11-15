import { describe, it, expect } from 'vitest'
import { localDayKey, isSameLocalDay } from '@tpl-passport/shared'

describe('localDayKey', () => {
  it('returns YYYY-MM-DD for a valid input', () => {
    expect(localDayKey('2026-03-08T10:15:00.000Z', 'America/Toronto')).toBe('2026-03-08')
  })

  it('handles midnight boundary correctly for explicit timezone', () => {
    expect(localDayKey('2026-03-08T04:30:00.000Z', 'America/Toronto')).toBe('2026-03-07')
    expect(localDayKey('2026-03-08T05:30:00.000Z', 'America/Toronto')).toBe('2026-03-08')
  })

  it('handles DST fallback without changing the day key', () => {
    expect(localDayKey('2026-11-01T05:30:00.000Z', 'America/Toronto')).toBe('2026-11-01')
    expect(localDayKey('2026-11-01T06:30:00.000Z', 'America/Toronto')).toBe('2026-11-01')
  })

  it('returns empty string for invalid input', () => {
    expect(localDayKey('not-a-date', 'America/Toronto')).toBe('')
  })
})

describe('isSameLocalDay', () => {
  it('compares timestamps using local day keys in a specific timezone', () => {
    expect(isSameLocalDay(
      '2026-03-08T12:00:00.000Z',
      '2026-03-08T23:00:00.000Z',
      'America/Toronto'
    )).toBe(true)
    expect(isSameLocalDay(
      '2026-03-08T03:00:00.000Z',
      '2026-03-08T12:00:00.000Z',
      'America/Toronto'
    )).toBe(false)
  })
})

import { checkInDayKey, dayRangeUtc, BRANCH_TIME_ZONE } from '@tpl-passport/shared'

describe('checkInDayKey', () => {
  it('uses the library day in Toronto, not UTC or the device zone', () => {
    expect(BRANCH_TIME_ZONE).toBe('America/Toronto')
    // 8pm EST on Nov 14 is 01:00 UTC on Nov 15.
    expect(checkInDayKey('2026-11-15T01:00:00.000Z')).toBe('2026-11-14')
    // 8:30pm EDT on Jul 1 is 00:30 UTC on Jul 2.
    expect(checkInDayKey('2026-07-02T00:30:00.000Z')).toBe('2026-07-01')
  })
})

describe('dayRangeUtc', () => {
  it('gives the UTC bounds of a Toronto day, including DST changes', () => {
    expect(dayRangeUtc('2026-11-14')).toEqual({ start: '2026-11-14T05:00:00.000Z', end: '2026-11-15T05:00:00.000Z' })
    expect(dayRangeUtc('2026-03-08')).toEqual({ start: '2026-03-08T05:00:00.000Z', end: '2026-03-09T04:00:00.000Z' })
    expect(dayRangeUtc('2026-11-01')).toEqual({ start: '2026-11-01T04:00:00.000Z', end: '2026-11-02T05:00:00.000Z' })
    expect(dayRangeUtc('bad')).toBeNull()
  })
})
