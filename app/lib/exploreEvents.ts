// Turns /api/all-events records into the What's On list (ExploreEvents).
import type { Branch } from '@tpl-passport/shared'
import { BRANCH_TIME_ZONE, haversineKm, localDayKey } from '@tpl-passport/shared'

// One record from /api/all-events (the CKAN TPL events feed).
export interface RawEvent {
  _id: string | number
  Title?: string
  StartDateLocal: string
  StartTime?: string
  EndTime?: string
  LocationName?: string
  Audiences?: string
}

export interface ExploreEvent {
  id: string | number
  title: string
  date: string
  // Toronto wall-clock times, "YYYY-MM-DDTHH:MM:SS" (or '' when missing).
  start: string
  end: string
  audiences: string
  locationName: string
  branch: Branch | null
}

// Branch names as the feed writes them: no " Branch" suffix (but Long Branch
// keeps its name), and either kind of apostrophe.
export function branchKey(name: string): string {
  return name
    .replace(/(.) Branch$/i, '$1')
    .replace(/[’‘`]/g, '\'')
    .trim()
    .toLowerCase()
}

export function branchLookup(branches: Branch[]): Map<string, Branch> {
  const map = new Map<string, Branch>()
  for (const b of branches) {
    map.set(branchKey(b.BranchName), b)
    // "Long Branch" is also its own short name.
    map.set(b.BranchName.trim().toLowerCase().replace(/[’‘`]/g, '\''), b)
  }
  return map
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
      locationName,
      branch: branches.get(branchKey(locationName)) ?? null,
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

// By day, then start time. With a position, events within the same day go
// nearest first in 2 km bands (so a nearby 4pm event beats one across town
// at 2pm), by start time within a band. Online events go last.
export function sortEvents(events: ExploreEvent[], lat: number | null, lng: number | null): ExploreEvent[] {
  const hasPos = lat != null && lng != null
  const band = (e: ExploreEvent) => {
    if (!hasPos) return 0
    const km = distanceKm(e, lat, lng)
    return km == null ? Number.POSITIVE_INFINITY : Math.floor(km / 2)
  }
  return events
    .map(e => ({ e, band: band(e) }))
    .sort((a, b) => {
      if (a.e.date !== b.e.date) return a.e.date < b.e.date ? -1 : 1
      if (a.band !== b.band) return a.band - b.band
      if (a.e.start !== b.e.start) return a.e.start < b.e.start ? -1 : 1
      return a.e.title.localeCompare(b.e.title)
    })
    .map(x => x.e)
}

export function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}

// Calendar arithmetic on a YYYY-MM-DD key (no time zone involved).
export function addDays(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
