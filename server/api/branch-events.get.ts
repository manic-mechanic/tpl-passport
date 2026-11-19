// Proxies TPL events from the Toronto Open Data CKAN API.
// This avoids CORS issues when calling the API directly from the browser.
// LocationName uses short names (e.g., "Agincourt"), so we strip the
// common " Branch" suffix from the branch name before filtering.
//
// Makes two parallel exact-date requests (today + tomorrow) combined with
// a LocationName filter. This matches the useAllEvents pattern and avoids
// the limit=100 + client-side filterToWindow approach that misses events
// for busy branches with 100+ past or far-future records.
import { reportServerError } from '../lib/reportServerError'
import { eventDates } from '../lib/eventDates'
import { compareEvents, fetchCkanEvents, setEventsCacheHeaders } from '../lib/ckanEvents'

export default defineEventHandler(async (event) => {
  const { library } = getQuery(event)
  if (!library || typeof library !== 'string') {
    setEventsCacheHeaders(event, false)
    return []
  }

  const shortName = library.replace(/ Branch$/i, '')
  const dates = eventDates(0, 2)

  // Keep the days that loaded if one fails; the response then isn't cached.
  const results = await Promise.allSettled(dates.map(date => fetchCkanEvents(date, shortName)))
  for (const [i, result] of results.entries()) {
    if (result.status === 'rejected') {
      reportServerError(result.reason, {
        area: 'events',
        operation: 'branch_events_fetch',
        library: shortName,
        date: dates[i],
      })
    }
  }
  setEventsCacheHeaders(event, results.every(r => r.status === 'fulfilled'))
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []).sort(compareEvents)
})
