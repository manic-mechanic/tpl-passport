import { describe, it, expect } from 'vitest'
import { reconcileCheckIns } from '../app/lib/checkInSyncMerge'

describe('reconcileCheckIns', () => {
  it('keeps server records for matching timestamps and appends only local-only records', () => {
    const server = [
      { branchCode: 'AG', timestamp: '2026-04-10T10:00:00.000Z', note: 'server' },
      { branchCode: 'HP', timestamp: '2026-04-08T10:00:00.000Z', note: 'server-hp' },
    ]
    const local = [
      { branchCode: 'AG', timestamp: '2026-04-10T10:00:00.000Z', note: 'local-stale' },
      { branchCode: 'WH', timestamp: '2026-04-09T10:00:00.000Z', note: 'local-only' },
    ]

    const { merged, localOnly } = reconcileCheckIns(server, local)

    expect(localOnly).toEqual([
      { branchCode: 'WH', timestamp: '2026-04-09T10:00:00.000Z', note: 'local-only' },
    ])
    expect(merged).toEqual([
      { branchCode: 'AG', timestamp: '2026-04-10T10:00:00.000Z', note: 'server' },
      { branchCode: 'WH', timestamp: '2026-04-09T10:00:00.000Z', note: 'local-only' },
      { branchCode: 'HP', timestamp: '2026-04-08T10:00:00.000Z', note: 'server-hp' },
    ])
  })

  it('sorts merged check-ins newest-first by timestamp', () => {
    const server = [
      { branchCode: 'A', timestamp: '2026-04-01T10:00:00.000Z', note: '' },
    ]
    const local = [
      { branchCode: 'B', timestamp: '2026-04-03T10:00:00.000Z', note: '' },
      { branchCode: 'C', timestamp: '2026-04-02T10:00:00.000Z', note: '' },
    ]

    const { merged } = reconcileCheckIns(server, local)
    expect(merged.map(c => c.branchCode)).toEqual(['B', 'C', 'A'])
  })

  it('returns empty localOnly when local has no additional timestamps', () => {
    const server = [{ branchCode: 'AG', timestamp: '2026-04-10T10:00:00.000Z', note: '' }]
    const local = [{ branchCode: 'AG', timestamp: '2026-04-10T10:00:00.000Z', note: '' }]

    const { localOnly } = reconcileCheckIns(server, local)
    expect(localOnly).toEqual([])
  })
})

describe('reconcileCheckIns same-day duplicates', () => {
  it('drops a local check-in for a branch and day the server already has', () => {
    const server = [{ branchCode: 'AG', timestamp: '2026-04-10T14:00:00.000Z', note: '' }]
    const local = [{ branchCode: 'AG', timestamp: '2026-04-10T14:05:00.000Z', note: '' }]

    const { merged, localOnly } = reconcileCheckIns(server, local)
    expect(localOnly).toEqual([])
    expect(merged).toEqual(server)
  })

  it('moves the local note and hosted photo onto the server copy and marks it for upload', () => {
    const server = [{ branchCode: 'AG', timestamp: '2026-04-10T14:00:00.000Z', note: '' }]
    const local = [{
      branchCode: 'AG', timestamp: '2026-04-10T14:05:00.000Z', note: 'nice reading room',
      hasPhoto: true, photoUri: 'https://example.com/p.jpg',
    }]

    const { merged, updated, photoMoves } = reconcileCheckIns(server, local)
    const expected = {
      branchCode: 'AG', timestamp: '2026-04-10T14:00:00.000Z', note: 'nice reading room',
      hasPhoto: true, photoUri: 'https://example.com/p.jpg',
    }
    expect(merged).toEqual([expected])
    expect(updated).toEqual([expected])
    expect(photoMoves).toEqual([])
  })

  it('re-keys a device-only photo from the dropped duplicate', () => {
    const server = [{ branchCode: 'AG', timestamp: '2026-04-10T14:00:00.000Z', note: '' }]
    const local = [{ branchCode: 'AG', timestamp: '2026-04-10T14:05:00.000Z', note: '', hasPhoto: true }]

    const { merged, updated, photoMoves } = reconcileCheckIns(server, local)
    expect(merged[0].hasPhoto).toBe(true)
    expect(updated).toEqual([])
    expect(photoMoves).toEqual([{ from: '2026-04-10T14:05:00.000Z', to: '2026-04-10T14:00:00.000Z' }])
  })

  it('leaves the server copy alone when it already has a note and photo', () => {
    const server = [{ branchCode: 'AG', timestamp: '2026-04-10T14:00:00.000Z', note: 'server', hasPhoto: true, photoUri: 'https://example.com/s.jpg' }]
    const local = [{ branchCode: 'AG', timestamp: '2026-04-10T14:05:00.000Z', note: 'local', hasPhoto: true }]

    const { updated, photoMoves } = reconcileCheckIns(server, local)
    expect(updated).toEqual([])
    expect(photoMoves).toEqual([])
  })

  it('does not mutate the server input', () => {
    const server = [{ branchCode: 'AG', timestamp: '2026-04-10T14:00:00.000Z', note: '' }]
    reconcileCheckIns(server, [{ branchCode: 'AG', timestamp: '2026-04-10T14:05:00.000Z', note: 'x' }])
    expect(server[0].note).toBe('')
  })

  it('keeps visits to the same branch on different days', () => {
    const server = [{ branchCode: 'AG', timestamp: '2026-04-10T14:00:00.000Z', note: '' }]
    const local = [{ branchCode: 'AG', timestamp: '2026-04-12T14:00:00.000Z', note: '' }]
    const { localOnly } = reconcileCheckIns(server, local)
    expect(localOnly).toHaveLength(1)
  })
})

describe('reconcileCheckIns uses the library day', () => {
  it('treats an evening visit as the same Toronto day even when the UTC date differs', () => {
    // 9am EST and 8pm EST on Nov 14; the second is Nov 15 in UTC.
    const server = [{ branchCode: 'AN', timestamp: '2026-11-14T14:00:00.000Z', note: '' }]
    const local = [{ branchCode: 'AN', timestamp: '2026-11-15T01:00:00.000Z', note: '' }]
    const { merged, localOnly } = reconcileCheckIns(server, local)
    expect(localOnly).toHaveLength(0)
    expect(merged).toHaveLength(1)
  })

  it('keeps an evening visit and the next morning as separate days', () => {
    // 8pm EST Nov 14 (Nov 15 UTC) and 10am EST Nov 15.
    const server = [{ branchCode: 'AN', timestamp: '2026-11-15T01:00:00.000Z', note: '' }]
    const local = [{ branchCode: 'AN', timestamp: '2026-11-15T15:00:00.000Z', note: '' }]
    const { localOnly } = reconcileCheckIns(server, local)
    expect(localOnly).toHaveLength(1)
  })
})
