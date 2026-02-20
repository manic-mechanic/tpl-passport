// Proxies TPL events from the Toronto Open Data CKAN API.
// This avoids CORS issues when calling the API directly from the browser.
// The `library` field in events uses short names (e.g., "Agincourt"),
// so we strip the common " Branch" suffix from the branch name before filtering.

const EVENTS_RESOURCE = 'c73bbe54-3a48-4ada-8eef-a1a2864021e4'
const CKAN = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action'

export default defineEventHandler(async (event) => {
  const { library } = getQuery(event)
  if (!library) return []

  // TPL events use short names — strip " Branch" suffix if present
  const shortName = String(library).replace(/ Branch$/i, '')

  try {
    const filters = JSON.stringify({ library: shortName })
    const url = `${CKAN}/datastore_search?id=${EVENTS_RESOURCE}&filters=${encodeURIComponent(filters)}&limit=30&sort=startdate`
    const res = await $fetch(url)
    return res.result?.records ?? []
  } catch {
    return []
  }
})
