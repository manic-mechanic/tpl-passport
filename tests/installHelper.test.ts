import { describe, expect, it } from 'vitest'
import { getInstallGuide } from '../app/lib/installHelper'

describe('getInstallGuide', () => {
  it('returns iOS Safari steps with share flow', () => {
    const guide = getInstallGuide('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')

    expect(guide.title).toBe('Install on iPhone or iPad')
    expect(guide.steps[0]).toContain('Share')
    expect(guide.steps[1]).toContain('Add to Home Screen')
  })

  it('asks non-Safari iOS users to open Safari first', () => {
    const guide = getInstallGuide('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1')

    expect(guide.steps[0]).toBe('Open this app in Safari.')
  })

  it('returns Firefox Android specific steps', () => {
    const guide = getInstallGuide('Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0')

    expect(guide.title).toBe('Install in Firefox on Android')
  })

  it('returns Samsung Internet specific warning step', () => {
    const guide = getInstallGuide('Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36')

    expect(guide.title).toBe('Install in Samsung Internet')
    expect(guide.steps[2]).toContain('Install anyway')
  })

  it('returns desktop Chromium steps', () => {
    const guide = getInstallGuide('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36')

    expect(guide.title).toBe('Install on desktop')
  })
})
