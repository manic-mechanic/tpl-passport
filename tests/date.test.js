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
