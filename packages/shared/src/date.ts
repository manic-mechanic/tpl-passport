// Day boundaries. Check-ins count "one per branch per day" by the library's
// local day, not the phone's: every branch is a Toronto Public Library branch,
// so the day is defined in BRANCH_TIME_ZONE wherever the app or server runs.
// Kept in sync with tpl-passport-auth's packages/shared/src/date.ts.

export const BRANCH_TIME_ZONE = 'America/Toronto'

const formatters = new Map<string, Intl.DateTimeFormat>()

function dayFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(timeZone, f)
  }
  return f
}

// "YYYY-MM-DD" for `input` in `timeZone` (default: the runtime's zone), or ''
// for an invalid date.
export function localDayKey(input: string | number | Date, timeZone?: string): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return ''

  const parts = dayFormatter(timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone).formatToParts(date)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value

  if (!year || !month || !day) return ''
  return `${year}-${month}-${day}`
}

export function isSameLocalDay(a: string | number | Date, b: string | number | Date, timeZone?: string): boolean {
  const aKey = localDayKey(a, timeZone)
  if (!aKey) return false
  return aKey === localDayKey(b, timeZone)
}

// The library day a check-in belongs to.
export function checkInDayKey(input: string | number | Date): string {
  return localDayKey(input, BRANCH_TIME_ZONE)
}

// Milliseconds to add to a UTC instant to get the wall-clock time in timeZone.
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const wallAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return wallAsUtc - Math.floor(utcMs / 1000) * 1000
}

// UTC instant of local midnight at the start of `dayKey` in timeZone.
function startOfDayMs(year: number, month: number, day: number, timeZone: string): number {
  const midnightAsUtc = Date.UTC(year, month - 1, day)
  const guess = midnightAsUtc - zoneOffsetMs(midnightAsUtc, timeZone)
  return midnightAsUtc - zoneOffsetMs(guess, timeZone)
}

// [start, end) of a local day as ISO UTC strings, for range queries over
// canonical ISO timestamps. Handles 23- and 25-hour days around DST changes.
export function dayRangeUtc(dayKey: string, timeZone: string = BRANCH_TIME_ZONE): { start: string, end: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey)
  if (!m) return null
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const start = startOfDayMs(year, month, day, timeZone)
  const end = startOfDayMs(year, month, day + 1, timeZone)
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() }
}
