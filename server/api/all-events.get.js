// Fetches upcoming library events (next 7 days) across all branches for the What's On feed.
// Proxied server-side to avoid CORS issues when calling CKAN from the browser.
//
// Uses exact-date requests because datastore_search doesn't support range filters.
// Supports incremental loading via query params so the client can fetch only the days it needs.
//
// Query params:
// - offset: start day offset from today (0=today)
// - days: number of days to fetch (1-7)
import { reportServerError } from '../lib/reportServerError'

const EVENTS_RESOURCE = 'c73bbe54-3a48-4ada-8eef-a1a2864021e4'
const CKAN = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action'
const CACHE_TTL = 30 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

const cacheByDate = new Map() // date -> { data, fetchedAt }

function dateString(offsetDays) {
  return new Date(Date.now() + offsetDays * MS_PER_DAY).toISOString().slice(0, 10)
}

function addDays(baseDate, daysToAdd) {
  const base = new Date(`${baseDate}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + daysToAdd)
  return base.toISOString().slice(0, 10)
}

async function fetchEventsForDate(date) {
  const now = Date.now()
  const cached = cacheByDate.get(date)
  if (cached && now - cached.fetchedAt <= CACHE_TTL) {
    return cached.data
  }

  try {
    const filters = encodeURIComponent(JSON.stringify({ StartDateLocal: date }))
    const result = await $fetch(`${CKAN}/datastore_search?id=${EVENTS_RESOURCE}&filters=${filters}&limit=200&sort=StartTime%20asc`)
    const data = result?.result?.records ?? []
    cacheByDate.set(date, { data, fetchedAt: now })
    return data
  } catch (error) {
    reportServerError(error, {
      area: 'events',
      operation: 'all_events_fetch_date',
      date,
    })
    return []
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const offset = Math.max(0, Math.min(6, Number.parseInt(String(query.offset ?? '0'), 10) || 0))
  const days = Math.max(1, Math.min(7, Number.parseInt(String(query.days ?? '7'), 10) || 7))
  const startDate = dateString(offset)
  const dates = Array.from({ length: days }, (_, i) => addDays(startDate, i))
  const results = await Promise.all(dates.map(fetchEventsForDate))
  const all = results.flatMap(records => records)
  return all.sort((a, b) => {
    if (a.StartDateLocal !== b.StartDateLocal) return a.StartDateLocal < b.StartDateLocal ? -1 : 1
    return (a.StartTime ?? '') < (b.StartTime ?? '') ? -1 : 1
  })
})
