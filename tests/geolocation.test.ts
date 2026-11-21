import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  cachedPosition, freshPosition, getPosition, locationPermission,
  NEARBY_MAX_AGE_MS, _resetLocationCache,
} from '../app/lib/geolocation'

function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    removeItem: (k: string) => { m.delete(k) },
  }
}

function fakeGeo(result: { lat: number, lng: number } | { code: number }) {
  return {
    getCurrentPosition: vi.fn((ok: PositionCallback, fail: PositionErrorCallback) => {
      setTimeout(() => {
        if ('code' in result) fail({ code: result.code } as GeolocationPositionError)
        else ok({ coords: { latitude: result.lat, longitude: result.lng } } as GeolocationPosition)
      }, 0)
    }),
  }
}

let geo: ReturnType<typeof fakeGeo>

beforeEach(() => {
  vi.stubGlobal('sessionStorage', fakeStorage())
  geo = fakeGeo({ lat: 43.65, lng: -79.38 })
  vi.stubGlobal('navigator', { geolocation: geo })
  _resetLocationCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('geolocation cache', () => {
  it('asks the browser once, then reuses the position', async () => {
    expect(await getPosition()).toEqual({ latitude: 43.65, longitude: -79.38 })
    expect(await getPosition()).toEqual({ latitude: 43.65, longitude: -79.38 })
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('shares one request between calls made at the same time', async () => {
    await Promise.all([getPosition(), getPosition(), freshPosition()])
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('asks again once the cached position is too old', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await getPosition()
    vi.setSystemTime(Date.now() + NEARBY_MAX_AGE_MS + 1)
    expect(cachedPosition()).toBeNull()
    await getPosition()
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2)
  })

  it('respects a shorter max age', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await getPosition()
    vi.setSystemTime(Date.now() + 90_000)
    expect(cachedPosition(60_000)).toBeNull()
    expect(cachedPosition(120_000)).not.toBeNull()
  })

  it('survives a reload through sessionStorage', async () => {
    await getPosition()
    const storage = globalThis.sessionStorage
    _resetLocationCache()   // clears both copies…
    expect(cachedPosition()).toBeNull()
    await getPosition()     // …so put one back and drop only the memory copy
    const raw = storage.getItem('tpl-passport:last-position')!
    _resetLocationCache()
    storage.setItem('tpl-passport:last-position', raw)
    expect(cachedPosition()).toMatchObject({ latitude: 43.65, longitude: -79.38 })
  })

  it('ignores a corrupt stored value', () => {
    globalThis.sessionStorage.setItem('tpl-passport:last-position', '{nope')
    expect(cachedPosition()).toBeNull()
  })

  it('still works when storage throws', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    })
    await getPosition()
    await getPosition()
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('passes errors through and caches nothing', async () => {
    geo = fakeGeo({ code: 1 })
    vi.stubGlobal('navigator', { geolocation: geo })
    await expect(getPosition()).rejects.toMatchObject({ code: 1 })
    expect(cachedPosition()).toBeNull()
  })

  it('rejects when geolocation is missing', async () => {
    vi.stubGlobal('navigator', {})
    await expect(getPosition()).rejects.toThrow('not available')
  })
})

describe('locationPermission', () => {
  it('returns the Permissions API state', async () => {
    vi.stubGlobal('navigator', { permissions: { query: async () => ({ state: 'granted' }) } })
    expect(await locationPermission()).toBe('granted')
  })

  it('is unknown without the Permissions API or when it throws', async () => {
    vi.stubGlobal('navigator', {})
    expect(await locationPermission()).toBe('unknown')
    vi.stubGlobal('navigator', { permissions: { query: async () => { throw new TypeError('x') } } })
    expect(await locationPermission()).toBe('unknown')
  })
})
