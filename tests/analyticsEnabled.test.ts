import { describe, expect, it } from 'vitest'
import { analyticsEnabled } from '../app/lib/analyticsEnabled'

describe('analyticsEnabled', () => {
  it('is on for Vercel production builds', () => {
    expect(analyticsEnabled({ vercelEnv: 'production', isDev: false })).toBe(true)
  })

  it('is off for previews and custom environments', () => {
    expect(analyticsEnabled({ vercelEnv: 'preview', isDev: false })).toBe(false)
    expect(analyticsEnabled({ vercelEnv: 'development', isDev: false })).toBe(false)
  })

  it('is off outside Vercel', () => {
    expect(analyticsEnabled({ vercelEnv: '', isDev: false })).toBe(false)
    expect(analyticsEnabled({ vercelEnv: undefined, isDev: false })).toBe(false)
    expect(analyticsEnabled({ vercelEnv: null, isDev: false })).toBe(false)
  })

  it('is off when dev features are on, even in production', () => {
    expect(analyticsEnabled({ vercelEnv: 'production', isDev: true })).toBe(false)
  })
})
