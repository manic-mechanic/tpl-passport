// Shared CKAN (Toronto Open Data) access for the TPL events routes.
import { setResponseHeader, type H3Event } from 'h3'

// A TPL event record from the CKAN datastore (only the fields used here).
export interface CkanEventRecord {
  StartDateLocal?: string
  StartTime?: string
  [key: string]: unknown
}

interface CkanSearchResponse {
  result?: { records?: CkanEventRecord[] }
}

export function compareEvents(a: CkanEventRecord, b: CkanEventRecord): number {
  if (a.StartDateLocal !== b.StartDateLocal) return (a.StartDateLocal ?? '') < (b.StartDateLocal ?? '') ? -1 : 1
  return (a.StartTime ?? '') < (b.StartTime ?? '') ? -1 : 1
}

// Lets Vercel's CDN keep an events response for 15 minutes, then serve it
// stale for up to 5 more while it refreshes in the background. Most
// requests then skip the function (and its cold start) and the CKAN calls,
// whose in-memory cache is lost whenever an instance is recycled. After
// midnight in Toronto, "today" can lag by up to that 20 minutes. A
// response missing a day because CKAN failed isn't cached at all.
export function setEventsCacheHeaders(event: H3Event, complete: boolean): void {
  setResponseHeader(event, 'cache-control', complete
    ? 'public, max-age=0, s-maxage=900, stale-while-revalidate=300'
    : 'no-store')
}

export const EVENTS_RESOURCE = 'c73bbe54-3a48-4ada-8eef-a1a2864021e4'
export const CKAN = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action'

// One day's events, optionally for one branch (CKAN LocationName).
export async function fetchCkanEvents(date: string, locationName?: string): Promise<CkanEventRecord[]> {
  const filters = encodeURIComponent(JSON.stringify(locationName ? { LocationName: locationName, StartDateLocal: date } : { StartDateLocal: date }))
  const res = await $fetch<CkanSearchResponse>(`${CKAN}/datastore_search?id=${EVENTS_RESOURCE}&filters=${filters}&limit=200&sort=StartTime%20asc`)
  return res?.result?.records ?? []
}
