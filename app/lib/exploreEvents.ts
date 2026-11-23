// Turns /api/all-events records into the What's On list (ExploreEvents).
import type { Branch } from '@tpl-passport/shared'
import { BRANCH_TIME_ZONE, eventLocationKey, haversineKm, localDayKey } from '@tpl-passport/shared'

// One record from /api/all-events (the CKAN TPL events feed).
export interface RawEvent {
  _id: string | number
  EventID?: string
  Title?: string
  StartDateLocal: string
  StartTime?: string
  EndTime?: string
  LocationName?: string
  Audiences?: string
  EventTypes?: string
}

export interface ExploreEvent {
  id: string | number
  title: string
  date: string
  // Toronto wall-clock times, "YYYY-MM-DDTHH:MM:SS" (or '' when missing).
  start: string
  end: string
  audiences: string
  // The feed's categories, e.g. "Crafts & Hobbies".
  types: string[]
  locationName: string
  branch: Branch | null
  url: string | null
}

// Branches by the feed's LocationName for them (eventLocationKey: straight
// apostrophes, Long Branch kept whole).
export function branchLookup(branches: Branch[]): Map<string, Branch> {
  return new Map(branches.map(b => [eventLocationKey(b.BranchName), b]))
}

// The feed lists some events twice, once under "<Branch> - Closed", and has
// "None" for online events.
export function cleanLocationName(name: string | undefined): string {
  const n = (name ?? '').replace(/\s+-\s+Closed$/i, '').trim()
  if (!n || n === 'None') return 'Online'
  return n
}

export function toExploreEvents(raw: RawEvent[], branches: Map<string, Branch>): ExploreEvent[] {
  const seen = new Set<string>()
  const out: ExploreEvent[] = []
  for (const r of raw) {
    const locationName = cleanLocationName(r.LocationName)
    const title = r.Title?.trim() || 'Event'
    const start = r.StartTime ?? ''
    const key = [title.toLowerCase(), start, locationName.toLowerCase()].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: r._id,
      title,
      date: r.StartDateLocal,
      start,
      end: r.EndTime ?? '',
      audiences: r.Audiences ?? '',
      types: parseTypes(r.EventTypes),
      locationName,
      branch: branches.get(eventLocationKey(locationName)) ?? null,
      url: eventUrl(r.EventID),
    })
  }
  return out
}

// Now as a Toronto wall-clock string, comparable with the feed's times.
export function torontoNow(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRANCH_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

export function torontoToday(now: Date = new Date()): string {
  return localDayKey(now, BRANCH_TIME_ZONE)
}

// An event is over once its end time (or, without one, its start) has passed.
export function isOver(event: ExploreEvent, nowWall: string): boolean {
  const end = event.end || event.start
  return !!end && end <= nowWall
}

export function distanceKm(event: ExploreEvent, lat: number | null, lng: number | null): number | null {
  if (lat == null || lng == null || !event.branch) return null
  return haversineKm(lat, lng, event.branch.Lat, event.branch.Long)
}

export type EventSort = 'time' | 'nearest'

// By day, then start time; or, with 'nearest' and a position, nearest branch
// first (online events last), by start time for the same branch.
export function sortEvents(events: ExploreEvent[], lat: number | null, lng: number | null, sort: EventSort = 'time'): ExploreEvent[] {
  const byDistance = sort === 'nearest' && lat != null && lng != null
  return events
    .map(e => ({ e, km: byDistance ? (distanceKm(e, lat, lng) ?? Number.POSITIVE_INFINITY) : 0 }))
    .sort((a, b) => {
      if (a.e.date !== b.e.date) return a.e.date < b.e.date ? -1 : 1
      if (a.km !== b.km) return a.km - b.km
      if (a.e.start !== b.e.start) return a.e.start < b.e.start ? -1 : 1
      return a.e.title.localeCompare(b.e.title)
    })
    .map(x => x.e)
}

// ── Filters ───────────────────────────────────────────────────────────
// Ages, by the feed's audience names.
export const AGE_GROUPS = [
  { id: 'little', label: 'Ages 0–5', audiences: ['Preschool Children (0-5)'] },
  { id: 'kids', label: 'Kids 6–12', audiences: ['School Age Children (6-12)'] },
  { id: 'teens', label: 'Teens', audiences: ['Teens (13-17)'] },
  { id: 'adults', label: 'Adults', audiences: ['Adults (18+)', 'Younger Adults (18-24)'] },
  { id: 'seniors', label: 'Seniors', audiences: ['Older Adults'] },
] as const
export type AgeGroupId = typeof AGE_GROUPS[number]['id']

function audienceList(audiences: string): string[] {
  return audiences.split(',').map(a => a.trim()).filter(Boolean)
}

// "Crafts & Hobbies, Culture" → ["Crafts & Hobbies", "Culture"]. Some
// names carry a stray zero-width space.
export function parseTypes(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map(t => t.replace(/\u200b/g, '').trim()).filter(Boolean)
}

// The types among some events, A to Z.
export function eventTypes(events: ExploreEvent[]): string[] {
  return [...new Set(events.flatMap(e => e.types))].sort((a, b) => a.localeCompare(b))
}

export function matchesAge(event: ExploreEvent, age: AgeGroupId | null): boolean {
  if (!age) return true
  const wanted: readonly string[] = AGE_GROUPS.find(g => g.id === age)?.audiences ?? []
  return audienceList(event.audiences).some(a => wanted.includes(a))
}

export const TIMES_OF_DAY = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
] as const
export type TimeOfDay = typeof TIMES_OF_DAY[number]['id']

export function timeOfDay(start: string): TimeOfDay | null {
  const hour = Number(start.slice(11, 13))
  if (!start || Number.isNaN(hour)) return null
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

// The bibliocommons page for an event (the feed's EventID).
export function eventUrl(eventId: string | undefined): string | null {
  return eventId ? `https://tpl.bibliocommons.com/events/${encodeURIComponent(eventId)}` : null
}


// Calendar arithmetic on a YYYY-MM-DD key (no time zone involved).
export function addDays(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
