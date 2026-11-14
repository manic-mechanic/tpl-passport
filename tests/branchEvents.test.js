// The integration test below verifies the CKAN API returns future-dated records
// when sorted descending, which was the fix for the bug where limit=200 asc
// only returned past events for busy branches.
//
// Note: the filterToWindow unit tests were removed when branch-events.get.js
// was refactored to use parallel exact-date CKAN queries (today + tomorrow)
// instead of client-side window filtering. The route no longer exports
// filterToWindow.

import { torontoDayKey, addDays, eventDates } from '../server/lib/eventDates'

describe('event date helpers', () => {
  it('uses the Toronto date, not the UTC date, in the evening', () => {
    // 21:30 in Toronto (EDT, UTC-4) on Jul 14 is already Jul 15 in UTC.
    const now = new Date('2026-07-15T01:30:00Z')
    expect(torontoDayKey(now)).toBe('2026-07-14')
  })

  it('uses the Toronto date across the EST offset too', () => {
    // 20:00 EST (UTC-5) on Jan 9 is Jan 10 01:00 UTC.
    expect(torontoDayKey(new Date('2026-01-10T01:00:00Z'))).toBe('2026-01-09')
  })

  it('adds calendar days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('builds a run of consecutive Toronto dates from an offset', () => {
    const now = new Date('2026-07-15T01:30:00Z')
    expect(eventDates(0, 2, now)).toEqual(['2026-07-14', '2026-07-15'])
    expect(eventDates(1, 3, now)).toEqual(['2026-07-15', '2026-07-16', '2026-07-17'])
  })
})

// Live call to the Toronto Open Data API. Skipped by default so the unit
// suite doesn't depend on a third-party service; run with RUN_INTEGRATION=1.
describe.skipIf(!process.env.RUN_INTEGRATION)('CKAN events API (integration)', () => {
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
