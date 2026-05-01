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
