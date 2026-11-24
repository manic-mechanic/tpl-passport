import { describe, it, expect } from 'vitest'
import { checkInDayKey } from '@tpl-passport/shared'
import { clampDay, dayLabel, daysAgo, shiftDay, timestampForDay, todayKey } from '../app/lib/checkInDate'

// 2026-11-24 15:30 in Toronto (EST, UTC-5)
const now = new Date('2026-11-24T20:30:00.000Z')

describe('picked check-in dates', () => {
  it('uses the library day', () => {
    expect(todayKey(now)).toBe('2026-11-24')
    // 23:30 Toronto on the 24th is already the 25th in UTC
    expect(todayKey(new Date('2026-11-25T04:30:00.000Z'))).toBe('2026-11-24')
  })

  it('steps across months and years', () => {
    expect(shiftDay('2026-11-01', -1)).toBe('2026-10-31')
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDay('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('counts days ago', () => {
    expect(daysAgo('2026-11-24', now)).toBe(0)
    expect(daysAgo('2026-11-23', now)).toBe(1)
    expect(daysAgo('2026-10-24', now)).toBe(31)
  })

  it('never goes past today', () => {
    expect(clampDay('2026-11-25', now)).toBe('2026-11-24')
    expect(clampDay('2026-11-20', now)).toBe('2026-11-20')
    expect(clampDay('1999-01-01', now, '2015-01-01')).toBe('2015-01-01')
    expect(clampDay('garbage', now)).toBe('2026-11-24')
  })

  it('stamps today now, and an earlier day at noon on that day', () => {
    expect(timestampForDay('2026-11-24', now)).toBe(now.toISOString())
    const earlier = timestampForDay('2026-11-20', now)
    expect(earlier).toBe('2026-11-20T17:00:00.000Z')
    expect(checkInDayKey(earlier)).toBe('2026-11-20')
    // Summer time
    expect(timestampForDay('2026-07-01', now)).toBe('2026-07-01T16:00:00.000Z')
  })

  it('labels days', () => {
    expect(dayLabel('2026-11-24', now)).toBe('Today, Tue Nov 24')
    expect(dayLabel('2026-11-23', now)).toBe('Yesterday, Mon Nov 23')
    expect(dayLabel('2026-11-20', now)).toBe('Fri Nov 20')
    expect(dayLabel('2025-12-31', now)).toBe('Wed Dec 31, 2025')
  })
})
