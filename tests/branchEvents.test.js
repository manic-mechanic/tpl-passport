// Integration test — verifies the CKAN API returns future-dated records
// when sorted descending, which was the fix for the bug where limit=200 asc
// only returned past events for busy branches.
//
// Note: the filterToWindow unit tests were removed when branch-events.get.js
// was refactored to use parallel exact-date CKAN queries (today + tomorrow)
// instead of client-side window filtering. The route no longer exports
// filterToWindow.

describe('CKAN events API (integration)', () => {
  it('returns records with the most future dates first when sorted desc', async () => {
    const RESOURCE = 'c73bbe54-3a48-4ada-8eef-a1a2864021e4'
    const CKAN     = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action'
    const filters  = encodeURIComponent('{"LocationName":"High Park"}')
    const url      = `${CKAN}/datastore_search?id=${RESOURCE}&filters=${filters}&limit=100&sort=StartDateLocal%20desc`

    const res  = await fetch(url)
    const json = await res.json()

    expect(res.ok).toBe(true)
    expect(json.success).toBe(true)

    const records = json.result?.records ?? []
    expect(records.length).toBeGreaterThan(0)

    // With desc sort, the first record should be the furthest-future date.
    // It must be >= today, proving future events are at the top of the result set.
    const today     = new Date().toISOString().slice(0, 10)
    const firstDate = records[0].StartDateLocal
    expect(firstDate >= today).toBe(true)

    // And the last record should be earlier than the first (confirming desc order).
    const lastDate = records[records.length - 1].StartDateLocal
    expect(firstDate >= lastDate).toBe(true)
  }, 15000)
})
