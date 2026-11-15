import { describe, it, expect } from 'vitest'
import { sentryEnvironment } from '../app/lib/sentryEnvironment'

describe('sentryEnvironment', () => {
  it('uses the Vercel environment when there is one', () => {
    expect(sentryEnvironment({ vercelEnv: 'production', isDev: false })).toBe('production')
    expect(sentryEnvironment({ vercelEnv: 'preview', isDev: false })).toBe('preview')
    expect(sentryEnvironment({ vercelEnv: 'preview', isDev: true })).toBe('preview')
    expect(sentryEnvironment({ vercelEnv: 'development', isDev: true })).toBe('development')
  })

  it('prefers the Vercel target environment, including custom ones', () => {
    expect(sentryEnvironment({ vercelEnv: 'preview', vercelTargetEnv: 'staging', isDev: false })).toBe('staging')
    expect(sentryEnvironment({ vercelEnv: 'production', vercelTargetEnv: 'production', isDev: false })).toBe('production')
    expect(sentryEnvironment({ vercelEnv: 'preview', vercelTargetEnv: '', isDev: false })).toBe('preview')
  })

  it('falls back to isDev off Vercel', () => {
    expect(sentryEnvironment({ vercelEnv: '', isDev: false })).toBe('production')
    expect(sentryEnvironment({ vercelEnv: undefined, isDev: true })).toBe('development')
    expect(sentryEnvironment({ vercelEnv: 'unknown', isDev: false })).toBe('production')
  })
})
