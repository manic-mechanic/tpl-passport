// Proxies TPL events from the Toronto Open Data CKAN API.
// This avoids CORS issues when calling the API directly from the browser.
// LocationName uses short names (e.g., "Agincourt"), so we strip the
// common " Branch" suffix from the branch name before filtering.
//
// Makes two parallel exact-date requests (today + tomorrow) combined with
// a LocationName filter. This matches the useAllEvents pattern and avoids
// the limit=100 + client-side filterToWindow approach that misses events
// for busy branches with 100+ past or far-future records.

const EVENTS_RESOURCE = 'c73bbe54-3a48-4ada-8eef-a1a2864021e4'
const CKAN = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action'

function dateString(offsetDays) {
  return new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  const { library } = getQuery(event)
  if (!library || Array.isArray(library)) return []

  const shortName = library.replace(/ Branch$/i, '')
  const dates = [dateString(0), dateString(1)]

  try {
    const results = await Promise.all(dates.map(date => {
      const filters = encodeURIComponent(JSON.stringify({ LocationName: shortName, StartDateLocal: date }))
      const url = `${CKAN}/datastore_search?id=${EVENTS_RESOURCE}&filters=${filters}&limit=200&sort=StartTime%20asc`
      return $fetch(url)
    }))

    const all = results.flatMap(res => res.result?.records ?? [])
    return all.sort((a, b) => {
      if (a.StartDateLocal !== b.StartDateLocal) return a.StartDateLocal < b.StartDateLocal ? -1 : 1
      return (a.StartTime ?? '') < (b.StartTime ?? '') ? -1 : 1
    })
  } catch {
    return []
  }
})
