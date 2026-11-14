// TPL events are listed by Toronto-local date (StartDateLocal). Computing
// "today" with toISOString() gives the UTC date, which is already tomorrow
// during Toronto evenings, so derive the day key in America/Toronto instead.
import { localDayKey } from '@tpl-passport/shared'

export const EVENTS_TIME_ZONE = 'America/Toronto'

export function torontoDayKey(now = new Date()) {
  return localDayKey(now, EVENTS_TIME_ZONE)
}

// Calendar arithmetic on a YYYY-MM-DD key (no time zone involved).
export function addDays(dayKey, daysToAdd) {
  const base = new Date(`${dayKey}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + daysToAdd)
  return base.toISOString().slice(0, 10)
}

export function eventDates(offsetDays, count, now = new Date()) {
  const start = addDays(torontoDayKey(now), offsetDays)
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}
