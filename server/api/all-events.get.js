// Fetches upcoming library events (next 7 days) across all branches for the What's On feed.
// Proxied server-side to avoid CORS issues when calling CKAN from the browser.
//
// Uses 7 parallel exact-date requests because datastore_search doesn't support range filters
// and a single sorted+limited request misses near-term events when the dataset has many future entries.
//
// In-memory stale-while-revalidate cache (~30 min TTL).
import { reportServerError } from '../lib/reportServerError'

const EVENTS_RESOURCE = 'c73bbe54-3a48-4ada-8eef-a1a2864021e4'
const CKAN = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action'
const CACHE_TTL = 30 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

let cache = null // { data, fetchedAt }

function dateString(offsetDays) {
  return new Date(Date.now() + offsetDays * MS_PER_DAY).toISOString().slice(0, 10)
}

async function fetchAllEvents() {
  const dates = Array.from({ length: 7 }, (_, i) => dateString(i))
  const results = await Promise.all(dates.map(date => {
    const filters = encodeURIComponent(JSON.stringify({ StartDateLocal: date }))
    return $fetch(`${CKAN}/datastore_search?id=${EVENTS_RESOURCE}&filters=${filters}&limit=200&sort=StartTime%20asc`)
  }))
  const all = results.flatMap(r => r.result?.records ?? [])
  return all.sort((a, b) => {
    if (a.StartDateLocal !== b.StartDateLocal) return a.StartDateLocal < b.StartDateLocal ? -1 : 1
    return (a.StartTime ?? '') < (b.StartTime ?? '') ? -1 : 1
  })
}

export default defineEventHandler(async () => {
  const now = Date.now()

  if (cache) {
    if (now - cache.fetchedAt > CACHE_TTL) {
      fetchAllEvents()
        .then(data => { cache = { data, fetchedAt: Date.now() } })
        .catch((error) => {
          reportServerError(error, {
            area: 'events',
            operation: 'all_events_cache_refresh',
          })
        })
    }
    return cache.data
  }

  try {
    const data = await fetchAllEvents()
    cache = { data, fetchedAt: now }
    return data
  } catch (error) {
    reportServerError(error, {
      area: 'events',
      operation: 'all_events_fetch',
    })
    return []
  }
})
