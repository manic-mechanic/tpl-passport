import { captureInstallPrompt, markInstalled } from '~/composables/useInstallPrompt'
import type { BeforeInstallPromptEvent } from '~/composables/useInstallPrompt'

// Listen from startup so Chrome's one-time install prompt isn't missed while
// pages are still loading. See composables/useInstallPrompt.ts.
export default defineNuxtPlugin(() => {
  window.addEventListener('beforeinstallprompt', (event) => {
    captureInstallPrompt(event as BeforeInstallPromptEvent)
  })
  window.addEventListener('appinstalled', () => {
    markInstalled()
    useNuxtApp().$posthog?.capture('pwa_installed')
  })
})
