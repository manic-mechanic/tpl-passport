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
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
  iosInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0.0 (iPhone15,2; iOS 18_0; en_CA; en; scale=3.00; 1179x2556; 0)',
  iosFacebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.0;FBBV/1;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.0;FBSS/3;FBCR/;FBID/phone;FBLC/en_CA;FBOP/5]',
  androidWebview: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0.0 Android',
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

  it('classes desktop Firefox as desktop, not other, with a fallback', () => {
    for (const ua of [UA.winFirefox, UA.linuxFirefox]) {
      const guide = getInstallGuide(ua)

      expect(guide.platform).toBe('desktop')
      expect(guide.fallback).toBeDefined()
    }
  })

  it('sends in-app browsers to a real browser first', () => {
    for (const ua of [UA.iosInstagram, UA.iosFacebook]) {
      const guide = getInstallGuide(ua)

      expect(guide.platform).toBe('ios')
      expect(guide.title).toBe('Open in your browser first')
      expect(guide.steps[0]).toMatchObject({ icon: 'more' })
      expect(guide.steps[0]!.text).toContain('Open in Safari')
    }

    const android = getInstallGuide(UA.androidWebview)
    expect(android.platform).toBe('android')
    expect(android.title).toBe('Open in your browser first')
  })

  it('does not treat regular Safari or Chrome as an in-app browser', () => {
    for (const ua of [UA.iosSafari, UA.iosChrome, UA.androidChrome, UA.samsung]) {
      expect(getInstallGuide(ua).title).not.toBe('Open in your browser first')
    }
  })

  it('returns desktop Chromium steps', () => {
    const guide = getInstallGuide(UA.macChrome)

    expect(guide.platform).toBe('desktop')
    expect(guide.steps[0]).toMatchObject({ icon: 'install' })
  })
})
