// Pin timezone so DST-sensitive tests are reproducible regardless of the host machine.
process.env.TZ = 'America/Toronto'

import { describe, it, expect, vi, afterEach } from 'vitest'
import { calcWeekStreak } from '../app/composables/useStreak.js'

// Build a check-in at local noon on the given date (avoids UTC-midnight parsing
// shifting the date to the previous day in negative-offset timezones).
function visit(year, month, day) {
  return { timestamp: new Date(year, month - 1, day, 12, 0, 0).toISOString() }
}

afterEach(() => vi.useRealTimers())

describe('calcWeekStreak', () => {
  it('returns 0 with no check-ins', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25))  // Mar 25
    expect(calcWeekStreak([])).toBe(0)
  })

  it('returns 0 when most recent visit is older than last week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25))  // Mar 25; last week = Mar 16
    expect(calcWeekStreak([visit(2026, 3, 8)])).toBe(0)  // week of Mar 2
  })

  it('returns 1 for a single visit this week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25))  // week of Mar 23
    expect(calcWeekStreak([visit(2026, 3, 24)])).toBe(1)
  })

  it('returns 1 for a single visit last week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25))  // last week = Mar 16
    expect(calcWeekStreak([visit(2026, 3, 17)])).toBe(1)
  })

  it('returns 2 for visits in two consecutive weeks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25))
    expect(calcWeekStreak([visit(2026, 3, 24), visit(2026, 3, 17)])).toBe(2)
  })

  it('stops counting at a gap in the streak', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25))
    // weeks: Mar 23 ✓, Mar 16 ✓, Mar 9 ✓, Mar 2 ✗ (gap), Feb 16 ✓
    const checkIns = [
      visit(2026, 3, 24),   // week of Mar 23
      visit(2026, 3, 18),   // week of Mar 16
      visit(2026, 3, 10),   // week of Mar 9
      visit(2026, 2, 17),   // week of Feb 16 — skips Mar 2
    ]
    expect(calcWeekStreak(checkIns)).toBe(3)
  })

  it('counts multiple visits in the same week as one streak week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25))
    const checkIns = [
      visit(2026, 3, 23),
      visit(2026, 3, 24),   // both in week of Mar 23
      visit(2026, 3, 17),   // week of Mar 16
    ]
    expect(calcWeekStreak(checkIns)).toBe(2)
  })

  it('counts correctly across the spring DST boundary (Mar 8 2026)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 11))  // Wednesday, week of Mar 9
    const checkIns = [
      visit(2026, 3, 9),    // week of Mar 9  — post-DST (EDT, UTC-4)
      visit(2026, 3, 3),    // week of Mar 2  — pre-DST  (EST, UTC-5)
      visit(2026, 2, 24),   // week of Feb 23 — pre-DST  (EST, UTC-5)
    ]
    // The raw-ms cursor approach would drift 1hr at the DST boundary,
    // failing to match the stored week key for Mar 2 and returning 1.
    expect(calcWeekStreak(checkIns)).toBe(3)
  })
})
