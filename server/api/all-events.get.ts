// Fetches upcoming library events (next 7 days) across all branches for the What's On feed.
// Proxied server-side to avoid CORS issues when calling CKAN from the browser.
//
// Uses exact-date requests because datastore_search doesn't support range filters.
// Supports incremental loading via query params so the client can fetch only the days it needs.
//
// Query params:
// - offset: start day offset from today (0=today)
// - days: number of days to fetch (1-7)
// - branches: optional branch codes ("WE,HIL"). Then the days come for
//   just those branches, in one CKAN call (the week view with a branch
//   filter on), instead of a call per day for every branch.
import { reportServerError } from '../lib/reportServerError'
import { eventDates } from '../lib/eventDates'
import { compareEvents, CKAN_EVENTS_LIMIT, feedNamesForCodes, fetchCkanEvents, fetchCkanEventsFor, setEventsCacheHeaders, type CkanEventRecord } from '../lib/ckanEvents'
// Short, since the CDN caches the response on top of this (see
// eventsCacheControl): together an event change shows within about 25 min.
const CACHE_TTL = 5 * 60 * 1000

const cacheByDate = new Map<string, { data: CkanEventRecord[], fetchedAt: number }>()

// Returns null when CKAN fails, so the response isn't cached without that day.
async function fetchEventsForDate(date: string): Promise<CkanEventRecord[] | null> {
  const now = Date.now()
  for (const [key, entry] of cacheByDate) {
    if (now - entry.fetchedAt > CACHE_TTL) cacheByDate.delete(key)
  }
  const cached = cacheByDate.get(date)
  if (cached && now - cached.fetchedAt <= CACHE_TTL) {
    return cached.data
  }

  try {
    const data = await fetchCkanEvents(date)
    cacheByDate.set(date, { data, fetchedAt: now })
    return data
  } catch (error) {
    reportServerError(error, {
      area: 'events',
      operation: 'all_events_fetch_date',
      date,
    })
    return null
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const offset = Math.max(0, Math.min(6, Number.parseInt(String(query.offset ?? '0'), 10) || 0))
  const days = Math.max(1, Math.min(7, Number.parseInt(String(query.days ?? '7'), 10) || 7))
  const dates = eventDates(offset, days)

  if (query.branches !== undefined) {
    const names = feedNamesForCodes(query.branches)
    if (names === null) {
      throw createError({ statusCode: 400, statusMessage: 'Too many branches' })
    }
    if (names.length === 0) {
      setEventsCacheHeaders(event, false)
      return []
    }
    try {
      const records = await fetchCkanEventsFor(dates, names)
      // At CKAN's limit the list may be cut short; say so rather than hide it.
      if (records.length >= CKAN_EVENTS_LIMIT) {
        reportServerError(new Error(`Branch week hit the ${CKAN_EVENTS_LIMIT}-record limit`), { area: 'events', operation: 'branch_week_fetch', branches: names.length, days })
      }
      setEventsCacheHeaders(event, true)
      return records.sort(compareEvents)
    } catch (error) {
      reportServerError(error, { area: 'events', operation: 'branch_week_fetch', branches: names.length, days })
      throw createError({ statusCode: 502, statusMessage: 'Events feed unavailable' })
    }
  }

  const results = await Promise.all(dates.map(fetchEventsForDate))
  setEventsCacheHeaders(event, results.every(r => r !== null))
  return results.flatMap(r => r ?? []).sort(compareEvents)
})
