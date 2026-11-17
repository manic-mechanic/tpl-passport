// Chrome's install prompt, captured once at startup by plugins/install-prompt.client.ts.
//
// beforeinstallprompt fires once per page load, often before any page has
// mounted, so a component that listens for it itself can miss it. The plugin
// stores it here and every install card reads the same state.

import { computed, readonly, ref, shallowRef } from 'vue'

// Not in the DOM lib types.
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// shallowRef: a deep reactive proxy would break prompt()'s `this`.
const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)
// The tab that installs the app is still not running standalone, so record it.
const installedThisSession = ref(false)

export function captureInstallPrompt(event: BeforeInstallPromptEvent) {
  event.preventDefault()
  deferredPrompt.value = event
}

export function markInstalled() {
  deferredPrompt.value = null
  installedThisSession.value = true
}

/**
 * Shows Chrome's install dialog. Returns the outcome, or null when there is no
 * prompt or it failed to open, so the caller can fall back to manual steps.
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | null> {
  const event = deferredPrompt.value
  if (!event) return null
  // A prompt can only be shown once.
  deferredPrompt.value = null
  try {
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') installedThisSession.value = true
    return outcome
  } catch {
    return null
  }
}

export function useInstallPrompt() {
  return {
    canPrompt: computed(() => deferredPrompt.value !== null),
    installedThisSession: readonly(installedThisSession),
  }
}
