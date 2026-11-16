// Shared CKAN (Toronto Open Data) access for the TPL events routes.
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

export const EVENTS_RESOURCE = 'c73bbe54-3a48-4ada-8eef-a1a2864021e4'
export const CKAN = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action'

// One day's events, optionally for one branch (CKAN LocationName).
export async function fetchCkanEvents(date: string, locationName?: string): Promise<CkanEventRecord[]> {
  const filters = encodeURIComponent(JSON.stringify(locationName ? { LocationName: locationName, StartDateLocal: date } : { StartDateLocal: date }))
  const res = await $fetch<CkanSearchResponse>(`${CKAN}/datastore_search?id=${EVENTS_RESOURCE}&filters=${filters}&limit=200&sort=StartTime%20asc`)
  return res?.result?.records ?? []
}
