type InstallGuide = {
  title: string
  steps: string[]
}

function hasAny(ua: string, needles: string[]): boolean {
  return needles.some((needle) => ua.includes(needle))
}

export function getInstallGuide(userAgent: string): InstallGuide {
  const ua = userAgent.toLowerCase()
  const isIos = hasAny(ua, ['iphone', 'ipad', 'ipod'])
  const isAndroid = ua.includes('android')
  const isSafari = ua.includes('safari') && !hasAny(ua, ['chrome', 'crios', 'edg', 'opr', 'fxios'])
  const isFirefox = hasAny(ua, ['firefox', 'fxios'])
  const isSamsungInternet = ua.includes('samsungbrowser')
  const isChromiumDesktop = !isAndroid && !isIos && hasAny(ua, ['chrome', 'edg', 'chromium'])
  const isDesktopSafari = !isIos && ua.includes('macintosh') && isSafari

  if (isIos) {
    return {
      title: 'Install on iPhone or iPad',
      steps: [
        ...(isSafari ? [] : ['Open this app in Safari.']),
        'Tap the Share button in the browser toolbar.',
        'Choose "Add to Home Screen", then tap "Add".',
      ],
    }
  }

  if (isAndroid && isFirefox) {
    return {
      title: 'Install in Firefox on Android',
      steps: [
        'Open the browser menu.',
        'Tap "Install" or "Add app to Home Screen".',
        'Confirm the install prompt.',
      ],
    }
  }

  if (isAndroid && isSamsungInternet) {
    return {
      title: 'Install in Samsung Internet',
      steps: [
        'Open the browser menu.',
        'Tap "Install app".',
        'If a safety warning appears, choose "Install anyway" to continue.',
      ],
    }
  }

  if (isAndroid) {
    return {
      title: 'Install on Android',
      steps: [
        'Open the browser menu.',
        'Tap "Install app" or "Add to Home screen".',
        'Confirm to finish installing.',
      ],
    }
  }

  if (isDesktopSafari) {
    return {
      title: 'Install in Safari on Mac',
      steps: [
        'Open the Share menu in Safari.',
        'Choose "Add to Dock".',
        'Confirm to install.',
      ],
    }
  }

  if (isChromiumDesktop) {
    return {
      title: 'Install on desktop',
      steps: [
        'Click the install icon in the address bar.',
        'Or open the browser menu and choose "Install app".',
        'Confirm to install.',
      ],
    }
  }

  return {
    title: 'Install this app',
    steps: [
      'Open your browser menu.',
      'Look for "Install app" or "Add to Home Screen".',
      'Follow the prompt to finish installing.',
    ],
  }
}

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const standaloneDisplay = window.matchMedia('(display-mode: standalone)').matches
  const safariStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return standaloneDisplay || safariStandalone
}
