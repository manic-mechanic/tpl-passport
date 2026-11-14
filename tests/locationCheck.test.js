import { describe, it, expect } from 'vitest'
import { shouldSkipLocationCheck } from '../app/lib/locationCheck'

describe('shouldSkipLocationCheck', () => {
  it('never skips in production, even with a saved bypass or the env flag', () => {
    expect(shouldSkipLocationCheck({ isDev: false, bypassGeofence: false, profileBypass: true })).toBe(false)
    expect(shouldSkipLocationCheck({ isDev: false, bypassGeofence: true, profileBypass: false })).toBe(false)
    expect(shouldSkipLocationCheck({ isDev: false, bypassGeofence: true, profileBypass: true })).toBe(false)
  })

  it('skips in dev when either bypass is on', () => {
    expect(shouldSkipLocationCheck({ isDev: true, bypassGeofence: true, profileBypass: false })).toBe(true)
    expect(shouldSkipLocationCheck({ isDev: true, bypassGeofence: false, profileBypass: true })).toBe(true)
  })

  it('checks location in dev when no bypass is on', () => {
    expect(shouldSkipLocationCheck({ isDev: true, bypassGeofence: false, profileBypass: false })).toBe(false)
  })
})
