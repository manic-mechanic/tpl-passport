export type InstallStepIcon = 'share' | 'more' | 'menu' | 'add' | 'install'

export type InstallStep = {
  text: string
  icon?: InstallStepIcon
}

export type InstallGuide = {
  title: string
  platform: 'ios' | 'android' | 'desktop' | 'other'
  steps: InstallStep[]
  // Shown under the steps when the browser might not support installing.
  fallback?: string
}

function hasAny(ua: string, needles: string[]): boolean {
  return needles.some((needle) => ua.includes(needle))
}

/**
 * Install steps for the current browser.
 *
 * `isTouchMac` covers iPadOS Safari, which reports a Mac user agent. Pass
 * `navigator.maxTouchPoints > 1` from the browser.
 */
export function getInstallGuide(userAgent: string, { isTouchMac = false } = {}): InstallGuide {
  const ua = userAgent.toLowerCase()
  const isMac = ua.includes('macintosh')
  const isIos = hasAny(ua, ['iphone', 'ipad', 'ipod']) || (isMac && isTouchMac)
  const isAndroid = ua.includes('android')
  const isSafari = ua.includes('safari') && !hasAny(ua, ['chrome', 'crios', 'edg', 'opr', 'fxios', 'firefox'])
  const isFirefox = hasAny(ua, ['firefox', 'fxios'])
  const isSamsungInternet = ua.includes('samsungbrowser')
  const isChromiumDesktop = !isAndroid && !isIos && hasAny(ua, ['chrome', 'edg', 'chromium'])
  const isDesktopSafari = !isIos && isMac && isSafari
  const isMobile = isIos || isAndroid || ua.includes('mobile')
  // Social and messaging apps open links in their own webview, which can't
  // install anything. Android webviews mark themselves with "; wv)".
  const isInAppBrowser = hasAny(ua, ['fban', 'fbav', 'instagram', 'gsa/', 'line/', 'micromessenger', 'twitter', 'linkedinapp', 'snapchat', '; wv)'])

  if (isInAppBrowser && (isIos || isAndroid)) {
    return {
      title: 'Open in your browser first',
      platform: isIos ? 'ios' : 'android',
      steps: isIos
        ? [
            { icon: 'more', text: 'Tap ••• or the share menu in this app, then choose "Open in Safari" or "Open in browser".' },
            { text: 'In Safari, tap "Show me" again for the install steps.' },
          ]
        : [
            { icon: 'menu', text: 'Tap the menu in this app, then choose "Open in browser" or "Open in Chrome".' },
            { text: 'In your browser, tap "Install" or "Show me" again.' },
          ],
    }
  }

  if (isIos && isSafari) {
    return {
      title: 'Add to your Home Screen',
      platform: 'ios',
      steps: [
        { icon: 'share', text: 'Tap the Share button. If you don\'t see it, tap ••• first.' },
        { icon: 'add', text: 'Scroll down and tap "Add to Home Screen".' },
        { text: 'Leave "Open as Web App" on, then tap "Add".' },
      ],
    }
  }

  if (isIos) {
    // Chrome, Edge and Firefox on iOS can add to the Home Screen since iOS 16.4.
    return {
      title: 'Add to your Home Screen',
      platform: 'ios',
      steps: [
        { icon: 'share', text: 'Tap the Share button. In Chrome it\'s in the address bar; in Firefox and Edge, open the menu first.' },
        { icon: 'add', text: 'Tap "Add to Home Screen".' },
        { text: 'Tap "Add".' },
      ],
      fallback: 'Don\'t see the option? Open this page in Safari and try there.',
    }
  }

  if (isAndroid && isFirefox) {
    return {
      title: 'Install in Firefox',
      platform: 'android',
      steps: [
        { icon: 'menu', text: 'Tap the menu button.' },
        { icon: 'install', text: 'Tap "Add app to Home screen" or "Install".' },
        { text: 'Confirm to finish.' },
      ],
    }
  }

  if (isAndroid && isSamsungInternet) {
    return {
      title: 'Install in Samsung Internet',
      platform: 'android',
      steps: [
        { icon: 'menu', text: 'Tap the menu button.' },
        { icon: 'install', text: 'Tap "Install app".' },
        { text: 'If a safety warning appears, choose "Install anyway".' },
      ],
    }
  }

  if (isAndroid) {
    return {
      title: 'Install on Android',
      platform: 'android',
      steps: [
        { icon: 'menu', text: 'Tap the menu button next to the address bar.' },
        { icon: 'install', text: 'Tap "Add to Home screen" or "Install app".' },
        { text: 'Tap "Install" to finish.' },
      ],
    }
  }

  if (isDesktopSafari) {
    return {
      title: 'Add to your Dock',
      platform: 'desktop',
      steps: [
        { icon: 'share', text: 'Click the Share button in the toolbar.' },
        { icon: 'add', text: 'Choose "Add to Dock".' },
        { text: 'Click "Add".' },
      ],
    }
  }

  if (isChromiumDesktop) {
    return {
      title: 'Install on your computer',
      platform: 'desktop',
      steps: [
        { icon: 'install', text: 'Click the install icon at the right of the address bar.' },
        { icon: 'menu', text: 'Or open the browser menu and choose "Install".' },
        { text: 'Confirm to finish.' },
      ],
    }
  }

  if (!isMobile) {
    // Firefox and other desktop browsers without a built-in install option.
    return {
      title: 'Install on your computer',
      platform: 'desktop',
      steps: [
        { icon: 'menu', text: 'Open your browser menu.' },
        { icon: 'install', text: 'Look for "Install" or "Install app".' },
        { text: 'Confirm to finish.' },
      ],
      fallback: 'No install option? Your browser may not support it. Chrome, Edge and Safari on Mac do.',
    }
  }

  return {
    title: 'Install this app',
    platform: 'other',
    steps: [
      { icon: 'menu', text: 'Open your browser menu.' },
      { icon: 'install', text: 'Look for "Install app" or "Add to Home Screen".' },
      { text: 'Follow the prompt to finish.' },
    ],
    fallback: 'Not every browser can install web apps. If yours can\'t, try Safari on iPhone or Chrome on Android.',
  }
}

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const standaloneDisplay = window.matchMedia('(display-mode: standalone)').matches
  const safariStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return standaloneDisplay || safariStandalone
}
