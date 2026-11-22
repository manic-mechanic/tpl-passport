import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eventLocationKey, eventLocationName } from '@tpl-passport/shared'
import branchInfo from '#data/branch-info.json'

describe('eventLocationName', () => {
  it('keeps "Long Branch", which the feed lists under its full name', () => {
    expect(eventLocationName('Long Branch')).toBe('Long Branch')
    expect(eventLocationName('long branch')).toBe('long branch')
  })

  it('straightens the curly apostrophe in Ethennonnhawahstihnen’', () => {
    expect(eventLocationName('Ethennonnhawahstihnen’')).toBe('Ethennonnhawahstihnen\'')
    expect(eventLocationName('Ethennonnhawahstihnen‘')).toBe('Ethennonnhawahstihnen\'')
    expect(eventLocationName('Ethennonnhawahstihnen`')).toBe('Ethennonnhawahstihnen\'')
  })

  it('still drops a " Branch" suffix from other names', () => {
    expect(eventLocationName('Agincourt Branch')).toBe('Agincourt')
    expect(eventLocationName('Agincourt')).toBe('Agincourt')
    expect(eventLocationName('Branch')).toBe('Branch')
  })

  it('matches feed names to branch names in the What\'s On tab', () => {
    expect(eventLocationKey('Ethennonnhawahstihnen\'')).toBe(eventLocationKey('Ethennonnhawahstihnen’'))
    expect(eventLocationKey('Long Branch')).toBe('long branch')
    expect(eventLocationKey('Agincourt - Closed')).not.toBe(eventLocationKey('Agincourt'))
  })

  it('leaves no curly apostrophe or "Long" in any branch\'s feed name', () => {
    for (const b of branchInfo as { BranchName: string }[]) {
      const name = eventLocationName(b.BranchName)
      expect(name).not.toMatch(/[’‘`]/)
      expect(name).not.toBe('Long')
    }
  })
})

describe('/api/branch-events LocationName filter', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ success: true, result: { records: [] } })
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('defineEventHandler', (h: unknown) => h)
    vi.stubGlobal('setResponseHeader', () => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function filtersFor(library: string) {
    vi.stubGlobal('getQuery', () => ({ library }))
    const { default: handler } = await import('../server/api/branch-events.get')
    await (handler as (e: unknown) => Promise<unknown>)({})
    return fetchMock.mock.calls.map(([url]) => {
      const raw = new URL(url as string).searchParams.get('filters')
      return JSON.parse(raw ?? '{}').LocationName
    })
  }

  it('filters Long Branch by "Long Branch"', async () => {
    expect(await filtersFor('Long Branch')).toEqual(['Long Branch', 'Long Branch'])
  })

  it('filters Ethennonnhawahstihnen’ by the feed\'s straight-apostrophe name', async () => {
    expect(await filtersFor('Ethennonnhawahstihnen’')).toEqual(['Ethennonnhawahstihnen\'', 'Ethennonnhawahstihnen\''])
  })
})
