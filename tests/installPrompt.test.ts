import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BeforeInstallPromptEvent } from '../app/composables/useInstallPrompt'

// Module state is shared, so load a fresh copy for each test.
async function load() {
  vi.resetModules()
  return await import('../app/composables/useInstallPrompt')
}

function fakeEvent(opts: { outcome?: 'accepted' | 'dismissed', promptFails?: boolean } = {}) {
  return {
    preventDefault: vi.fn(),
    prompt: opts.promptFails ? vi.fn().mockRejectedValue(new Error('InvalidStateError')) : vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: opts.outcome ?? 'accepted' }),
  } as unknown as BeforeInstallPromptEvent
}

describe('install prompt', () => {
  let mod: Awaited<ReturnType<typeof load>>
  beforeEach(async () => { mod = await load() })

  it('captures the event and offers a prompt', () => {
    const event = fakeEvent()
    mod.captureInstallPrompt(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(mod.useInstallPrompt().canPrompt.value).toBe(true)
  })

  it('marks the app installed when the prompt is accepted, and uses the prompt only once', async () => {
    mod.captureInstallPrompt(fakeEvent({ outcome: 'accepted' }))
    const state = mod.useInstallPrompt()

    expect(await mod.promptInstall()).toBe('accepted')
    expect(state.installedThisSession.value).toBe(true)
    expect(state.canPrompt.value).toBe(false)
    expect(await mod.promptInstall()).toBeNull()
  })

  it('does not mark the app installed when the prompt is declined', async () => {
    mod.captureInstallPrompt(fakeEvent({ outcome: 'dismissed' }))

    expect(await mod.promptInstall()).toBe('dismissed')
    expect(mod.useInstallPrompt().installedThisSession.value).toBe(false)
  })

  it('returns null and clears the prompt when it fails to open', async () => {
    mod.captureInstallPrompt(fakeEvent({ promptFails: true }))

    expect(await mod.promptInstall()).toBeNull()
    expect(mod.useInstallPrompt().canPrompt.value).toBe(false)
  })

  it('marks the app installed on appinstalled', () => {
    mod.captureInstallPrompt(fakeEvent())
    mod.markInstalled()
    const state = mod.useInstallPrompt()

    expect(state.installedThisSession.value).toBe(true)
    expect(state.canPrompt.value).toBe(false)
  })
})
