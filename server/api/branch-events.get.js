// Proxies TPL events from the Toronto Open Data CKAN API.
// This avoids CORS issues when calling the API directly from the browser.
// LocationName uses short names (e.g., "Agincourt"), so we strip the
// common " Branch" suffix from the branch name before filtering.
//
// datastore_search_sql is not available on this CKAN host (returns 404).
// Instead: sort descending so future events come first, then filter to
// today/tomorrow in filterToWindow. 100 records is plenty — sorting desc
// means we hit upcoming events immediately rather than wading through
// hundreds of past records.
//
// In-memory stale-while-revalidate cache (per library, ~1 hour TTL).
// Returns cached data immediately and refreshes in the background if stale.
// Falls back to [] on any error.

const EVENTS_RESOURCE = 'c73bbe54-3a48-4ada-8eef-a1a2864021e4'
const CKAN = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action'
const CACHE_TTL = 60 * 60 * 1000

const cache = new Map() // key: shortName → { data, fetchedAt }

export function filterToWindow(records) {
  const today    = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
  return records
    .filter(e => e.StartDateLocal >= today && e.StartDateLocal <= tomorrow)
    .sort((a, b) => a.StartDateLocal < b.StartDateLocal ? -1 : 1)
}

async function fetchFromCKAN(shortName) {
  const filters = `{"LocationName":"${shortName}"}`
  const url = `${CKAN}/datastore_search?id=${EVENTS_RESOURCE}&filters=${encodeURIComponent(filters)}&limit=100&sort=StartDateLocal%20desc`
  const res = await $fetch(url)
  return res.result?.records ?? []
}

export default defineEventHandler(async (event) => {
  const { library } = getQuery(event)
  if (!library || Array.isArray(library)) return []

  const shortName = library.replace(/ Branch$/i, '')
  const cached = cache.get(shortName)
  const now = Date.now()

  if (cached) {
    if (now - cached.fetchedAt > CACHE_TTL) {
      fetchFromCKAN(shortName)
        .then(data => cache.set(shortName, { data, fetchedAt: Date.now() }))
        .catch(() => {})
    }
    return filterToWindow(cached.data)
  }

  try {
    const records = await fetchFromCKAN(shortName)
    cache.set(shortName, { data: records, fetchedAt: now })
    return filterToWindow(records)
  } catch {
    return []
  }
})
