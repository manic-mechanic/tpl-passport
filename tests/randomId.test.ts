import { afterEach, describe, it, expect, vi } from 'vitest'
import { randomId } from '../app/lib/randomId'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('randomId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns a v4 UUID', () => {
    expect(randomId()).toMatch(UUID_V4)
  })

  it('still returns a v4 UUID where crypto.randomUUID is missing (insecure pages, old Safari)', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    const ids = new Set(Array.from({ length: 50 }, () => randomId()))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(UUID_V4)
  })
})
