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
  if (!library || typeof library !== 'string') return []

  const shortName = library.replace(/ Branch$/i, '')
  const dates = eventDates(0, 2)

  try {
    const results = await Promise.all(dates.map(date => fetchCkanEvents(date, shortName)))
    setEventsCacheHeaders(event, true)
    return results.flat().sort(compareEvents)
  } catch (error) {
    reportServerError(error, {
      area: 'events',
      operation: 'branch_events_fetch',
      library: shortName,
    })
    setEventsCacheHeaders(event, false)
    return []
  }
})
