// Dates for a picked check-in ("Pick another branch"): the person chooses a
// library day, today or earlier. Days are the library's (Toronto) days, the
// same rule as one check-in per branch per day.

import { checkInDayKey, dayRangeUtc } from '@tpl-passport/shared'

const DAY_MS = 24 * 60 * 60 * 1000

function parseKey(key: string): { y: number, m: number, d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

function keyFromUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function todayKey(now: Date = new Date()): string {
  return checkInDayKey(now)
}

// The day `days` after `key` (negative for earlier). Calendar arithmetic, so
// DST changes don't matter.
export function shiftDay(key: string, days: number): string {
  const p = parseKey(key)
  if (!p) return key
  return keyFromUtcDate(new Date(Date.UTC(p.y, p.m - 1, p.d + days)))
}

// Whole days from `key` to today; 0 for today.
export function daysAgo(key: string, now: Date = new Date()): number {
  const a = parseKey(key)
  const b = parseKey(todayKey(now))
  if (!a || !b) return 0
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / DAY_MS)
}

// Keeps a picked day between `earliest` and today.
export function clampDay(key: string, now: Date = new Date(), earliest = '2000-01-01'): string {
  const today = todayKey(now)
  if (!parseKey(key)) return today
  if (key > today) return today
  if (key < earliest) return earliest
  return key
}

// The check-in time for a picked day: now for today, noon (Toronto) for an
// earlier day, so the visit sorts and displays on the day that was picked.
export function timestampForDay(key: string, now: Date = new Date()): string {
  if (key >= todayKey(now)) return now.toISOString()
  const range = dayRangeUtc(key)
  if (!range) return now.toISOString()
  return new Date(Date.parse(range.start) + 12 * 60 * 60 * 1000).toISOString()
}

// "Today, Mon Nov 24", "Yesterday, Sun Nov 23", "Fri Nov 21"; the year is
// added for an earlier year.
export function dayLabel(key: string, now: Date = new Date()): string {
  const p = parseKey(key)
  if (!p) return ''
  const date = new Date(Date.UTC(p.y, p.m - 1, p.d, 12))
  const part = (opts: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString('en-CA', { timeZone: 'UTC', ...opts }).replace(/\./g, '')
  const sameYear = p.y === parseKey(todayKey(now))?.y
  const text = `${part({ weekday: 'short' })} ${part({ month: 'short' })} ${p.d}${sameYear ? '' : `, ${p.y}`}`
  const ago = daysAgo(key, now)
  if (ago === 0) return `Today, ${text}`
  if (ago === 1) return `Yesterday, ${text}`
  return text
}
