import { describe, expect, it } from 'vitest'
import { getInstallGuide } from '../app/lib/installHelper'

const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1',
  iosFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15',
  // iPadOS Safari reports a Mac user agent.
  ipadSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
}

const texts = (ua: string, opts?: { isTouchMac?: boolean }) =>
  getInstallGuide(ua, opts).steps.map((s) => s.text)

describe('getInstallGuide', () => {
  it('gives iOS Safari the share flow, including the ••• menu and the web app toggle', () => {
    const guide = getInstallGuide(UA.iosSafari)

    expect(guide.platform).toBe('ios')
    expect(guide.steps[0]).toMatchObject({ icon: 'share' })
    expect(guide.steps[0]!.text).toContain('•••')
    expect(guide.steps[1]!.text).toContain('Add to Home Screen')
    expect(guide.steps[2]!.text).toContain('Open as Web App')
    expect(guide.fallback).toBeUndefined()
  })

  it('lets Chrome and Firefox on iOS add to the Home Screen, with Safari as a fallback', () => {
    for (const ua of [UA.iosChrome, UA.iosFirefox]) {
      const guide = getInstallGuide(ua)

      expect(guide.platform).toBe('ios')
      expect(guide.steps[0]!.text).not.toContain('Open this app in Safari')
      expect(guide.steps[1]!.text).toContain('Add to Home Screen')
      expect(guide.fallback).toContain('Safari')
    }
  })

  it('treats a touch Mac (iPadOS) as iOS, and a desktop Mac as desktop', () => {
    expect(getInstallGuide(UA.ipadSafari, { isTouchMac: true }).platform).toBe('ios')
    expect(getInstallGuide(UA.macSafari).platform).toBe('desktop')
    expect(texts(UA.macSafari)[1]).toContain('Add to Dock')
  })

  it('gives Android Chrome user-facing steps only', () => {
    const guide = getInstallGuide(UA.androidChrome)

    expect(guide.platform).toBe('android')
    expect(texts(UA.androidChrome).join(' ')).not.toMatch(/HTTPS|localhost/)
  })

  it('returns Firefox Android specific steps', () => {
    expect(getInstallGuide(UA.androidFirefox).title).toBe('Install in Firefox')
  })

  it('returns Samsung Internet specific warning step', () => {
    const guide = getInstallGuide(UA.samsung)

    expect(guide.title).toBe('Install in Samsung Internet')
    expect(guide.steps[2]!.text).toContain('Install anyway')
  })

  it('returns desktop Chromium steps', () => {
    const guide = getInstallGuide(UA.macChrome)

    expect(guide.platform).toBe('desktop')
    expect(guide.steps[0]).toMatchObject({ icon: 'install' })
  })
})
