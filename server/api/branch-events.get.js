// Proxies TPL events from the Toronto Open Data CKAN API.
// This avoids CORS issues when calling the API directly from the browser.
// LocationName uses short names (e.g., "Agincourt"), so we strip the
// common " Branch" suffix from the branch name before filtering.
//
// In-memory stale-while-revalidate cache (per library, ~1 hour TTL).
// Returns cached data immediately and refreshes in the background if stale.
// Falls back to [] on any error.

const EVENTS_RESOURCE = 'c73bbe54-3a48-4ada-8eef-a1a2864021e4'
const CKAN = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour in ms

const cache = new Map() // key: shortName → { data, fetchedAt }

function todayAndTomorrow() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return [today.toISOString().slice(0, 10), tomorrow.toISOString().slice(0, 10)]
}

async function fetchFromCKAN(shortName) {
  const filters = JSON.stringify({ LocationName: shortName })
  // Limit 200 — active branches can have 100+ historical records sorted before upcoming ones.
  // We store raw records in cache and filter to today/tomorrow at read time, so stale
  // cache entries always return the correct date window even if the API is temporarily down.
  const url = `${CKAN}/datastore_search?id=${EVENTS_RESOURCE}&filters=${encodeURIComponent(filters)}&limit=200&sort=StartDateLocal`
  const res = await $fetch(url)
  return res.result?.records ?? []
}

export default defineEventHandler(async (event) => {
  const { library } = getQuery(event)
  if (!library) return []

  const shortName = String(library).replace(/ Branch$/i, '')
  const cached = cache.get(shortName)
  const now = Date.now()

  if (cached) {
    const stale = now - cached.fetchedAt > CACHE_TTL
    if (stale) {
      // Return stale data immediately; refresh in background
      fetchFromCKAN(shortName)
        .then(data => cache.set(shortName, { data, fetchedAt: Date.now() }))
        .catch(() => {})
    }
    // Filter to today/tomorrow at read time so stale cache stays correct
    const [todayStr, tomorrowStr] = todayAndTomorrow()
    return cached.data.filter(e => e.StartDateLocal >= todayStr && e.StartDateLocal <= tomorrowStr)
  }

  // No cache entry — fetch and cache before returning
  try {
    const records = await fetchFromCKAN(shortName)
    cache.set(shortName, { data: records, fetchedAt: now })
    const [todayStr, tomorrowStr] = todayAndTomorrow()
    return records.filter(e => e.StartDateLocal >= todayStr && e.StartDateLocal <= tomorrowStr)
  } catch {
    return []
  }
})
