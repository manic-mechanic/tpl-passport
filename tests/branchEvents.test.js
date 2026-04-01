import { describe, it, expect, vi } from 'vitest'

// Nitro globals must be stubbed before the server module is evaluated.
// vi.hoisted() runs synchronously before any imports are processed.
vi.hoisted(() => {
  globalThis.defineEventHandler = fn => fn
  globalThis.getQuery = () => ({})
  globalThis.$fetch = async () => ({ result: { records: [] } })
})

import { filterToWindow } from '../server/api/branch-events.get.js'

describe('filterToWindow', () => {
  it('keeps a record dated today', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(filterToWindow([{ StartDateLocal: today }])).toHaveLength(1)
  })

  it('keeps a record dated tomorrow', () => {
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
    expect(filterToWindow([{ StartDateLocal: tomorrow }])).toHaveLength(1)
  })

  it('drops past records', () => {
    expect(filterToWindow([{ StartDateLocal: '2020-01-01' }])).toHaveLength(0)
  })

  it('drops records more than one day in the future', () => {
    expect(filterToWindow([{ StartDateLocal: '2099-12-31' }])).toHaveLength(0)
  })

  it('handles a mix correctly', () => {
    const today    = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
    const records  = [
      { StartDateLocal: '2020-01-01' },  // past — filtered out
      { StartDateLocal: today },          // kept
      { StartDateLocal: tomorrow },       // kept
      { StartDateLocal: '2099-12-31' },  // too far future — filtered out
    ]
    expect(filterToWindow(records)).toHaveLength(2)
  })

  it('returns events sorted earliest first regardless of input order', () => {
    const today    = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
    // Simulate desc-sorted input from CKAN (tomorrow first)
    const records = [{ StartDateLocal: tomorrow }, { StartDateLocal: today }]
    const result  = filterToWindow(records)
    expect(result[0].StartDateLocal).toBe(today)
    expect(result[1].StartDateLocal).toBe(tomorrow)
  })
})

// Integration test — hits the real CKAN API.
// Verifies that sorting desc actually surfaces future-dated records,
// which is the fix for the bug where limit=200 asc only returned past events.
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
