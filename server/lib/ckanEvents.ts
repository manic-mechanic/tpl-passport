// Shared CKAN (Toronto Open Data) access for the TPL events routes.
import type { H3Event } from 'h3'
import { branchesByCode, dayRangeUtc } from '@tpl-passport/shared'
import { torontoDayKey } from './eventDates'

// A TPL event record from the CKAN datastore (only the fields used here).
export interface CkanEventRecord {
  StartDateLocal?: string
  StartTime?: string
  [key: string]: unknown
}

interface CkanSearchResponse {
  success?: boolean
  result?: { records?: CkanEventRecord[] }
}

export function compareEvents(a: CkanEventRecord, b: CkanEventRecord): number {
  if (a.StartDateLocal !== b.StartDateLocal) return (a.StartDateLocal ?? '') < (b.StartDateLocal ?? '') ? -1 : 1
  return (a.StartTime ?? '') < (b.StartTime ?? '') ? -1 : 1
}

// How long Vercel's CDN may keep an events response. The routes take
// relative days (offset=0 is "today"), so a cached copy must not outlive
// the Toronto day it was made on: both windows are capped at midnight.
// Within the day, the CDN keeps it for up to 15 minutes and may serve it
// stale for up to 5 more while it refreshes in the background, so most
// requests skip the function (and its cold start) and the CKAN calls. A
// response missing a day because CKAN failed isn't cached at all.
export const EVENTS_CDN_MAX_AGE = 900
export const EVENTS_CDN_STALE = 300

export function eventsCacheControl(complete: boolean, now: Date = new Date()): string {
  const midnight = dayRangeUtc(torontoDayKey(now))?.end
  const untilMidnight = midnight ? Math.floor((Date.parse(midnight) - now.getTime()) / 1000) : 0
  const maxAge = Math.min(EVENTS_CDN_MAX_AGE, untilMidnight)
  const stale = Math.min(EVENTS_CDN_STALE, untilMidnight - maxAge)
  if (!complete || maxAge < 1) return 'no-store'
  return `public, max-age=0, s-maxage=${maxAge}` + (stale > 0 ? `, stale-while-revalidate=${stale}` : '')
}

export function setEventsCacheHeaders(event: H3Event, complete: boolean): void {
  setResponseHeader(event, 'cache-control', eventsCacheControl(complete))
}

export const EVENTS_RESOURCE = 'c73bbe54-3a48-4ada-8eef-a1a2864021e4'
export const CKAN = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action'

// One day's events, optionally for one branch (CKAN LocationName). Throws
// when CKAN answers without results (it can send success: false with a
// 200), so callers don't cache an error as "no events".
export async function fetchCkanEvents(date: string, locationName?: string): Promise<CkanEventRecord[]> {
  const filters = encodeURIComponent(JSON.stringify(locationName ? { LocationName: locationName, StartDateLocal: date } : { StartDateLocal: date }))
  const res = await $fetch<CkanSearchResponse>(`${CKAN}/datastore_search?id=${EVENTS_RESOURCE}&filters=${filters}&limit=200&sort=StartTime%20asc`)
  if (!res?.success || !Array.isArray(res.result?.records)) {
    throw new Error(`CKAN datastore_search returned no records for ${date}${locationName ? ` (${locationName})` : ''}`)
  }
  return res.result.records
}

// The feed's LocationName for a branch: our BranchName, with a straight
// apostrophe (Ethennonnhawahstihnen’ is "Ethennonnhawahstihnen'" there).
export function feedLocationName(branchName: string): string {
  return branchName.replace(/[’‘]/g, '\'')
}

// Branch codes from a query ("WE,HIL") to feed names; unknown codes are
// dropped, and at most 40 are kept (a district has about 30).
export function feedNamesForCodes(raw: unknown): string[] {
  const codes = String(raw ?? '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
  const names = codes.map(c => branchesByCode[c]?.BranchName).filter((n): n is string => !!n)
  return [...new Set(names.map(feedLocationName))].sort().slice(0, 40)
}

// Several days of events for some branches, in one CKAN call: datastore
// filters take a list of values per field. Throws like fetchCkanEvents.
export async function fetchCkanEventsFor(dates: string[], locationNames: string[]): Promise<CkanEventRecord[]> {
  const filters = encodeURIComponent(JSON.stringify({ LocationName: locationNames, StartDateLocal: dates }))
  const res = await $fetch<CkanSearchResponse>(`${CKAN}/datastore_search?id=${EVENTS_RESOURCE}&filters=${filters}&limit=2000&sort=StartTime%20asc`)
  if (!res?.success || !Array.isArray(res.result?.records)) {
    throw new Error(`CKAN datastore_search returned no records for ${dates.join(',')} (${locationNames.length} branches)`)
  }
  return res.result.records
}
