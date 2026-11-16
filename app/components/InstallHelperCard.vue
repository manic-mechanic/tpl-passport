<template>
  <div v-if="visible" class="install-helper card">
    <img src="/icon-192.png" class="install-app-icon" alt="" aria-hidden="true" />
    <div class="install-copy">
      <span class="install-title">Add to Home Screen</span>
      <p class="install-hint">Open your passport in one tap, like an app.</p>
    </div>
    <button class="install-action" @click="openInstallHelper">
      {{ canPromptInstall ? 'Install' : 'Show me' }}
    </button>
    <button v-if="dismissible" class="install-dismiss" aria-label="Dismiss" @click="dismiss">
      <IconClose width="14" height="14" />
    </button>
  </div>

  <BaseSheet
    v-model:open="showInstallSheet"
    aria-label="Install app instructions"
  >
    <div class="install-sheet">
      <h2 class="install-sheet-title">{{ installGuide.title }}</h2>
      <ol class="install-step-list">
        <li v-for="(step, i) in installGuide.steps" :key="step.text" class="install-step">
          <span class="install-step-num" aria-hidden="true">{{ i + 1 }}</span>
          <span class="install-step-text">{{ step.text }}</span>
          <span v-if="step.icon" class="install-step-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <template v-if="step.icon === 'share'">
                <path d="M12 3v12" />
                <path d="M8 7l4-4 4 4" />
                <path d="M7 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1" />
              </template>
              <template v-else-if="step.icon === 'add'">
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M12 8v8M8 12h8" />
              </template>
              <template v-else-if="step.icon === 'menu'">
                <circle cx="12" cy="5" r="1.2" fill="currentColor" />
                <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                <circle cx="12" cy="19" r="1.2" fill="currentColor" />
              </template>
              <template v-else-if="step.icon === 'install'">
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <path d="M12 7v6M9 10l3 3 3-3M8 21h8" />
              </template>
              <template v-else-if="step.icon === 'more'">
                <circle cx="5" cy="12" r="1.2" fill="currentColor" />
                <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                <circle cx="19" cy="12" r="1.2" fill="currentColor" />
              </template>
            </svg>
          </span>
        </li>
      </ol>
      <p v-if="installGuide.fallback" class="install-fallback">{{ installGuide.fallback }}</p>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
import { getInstallGuide, isRunningStandalone } from '~/lib/installHelper'
import type { InstallGuide } from '~/lib/installHelper'
import IconClose from '~/components/icons/IconClose.vue'

const props = withDefaults(defineProps<{
  // Home: can be dismissed, and stays hidden on desktop. Settings keeps it available.
  dismissible?: boolean
}>(), {
  dismissible: false,
})

const DISMISS_KEY = 'install_card_dismissed'

// Chrome's install prompt event; not in the DOM lib types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const { $posthog } = useNuxtApp()

const deferredInstallEvent = ref<BeforeInstallPromptEvent | null>(null)
const mounted = ref(false)
const isInstalled = ref(false)
const dismissed = ref(false)
const showInstallSheet = ref(false)
const installGuide = ref<InstallGuide>({ title: 'Install this app', platform: 'other', steps: [] })

const canPromptInstall = computed(() => Boolean(deferredInstallEvent.value))

// Rendered only after mount so the server render never shows it to installed users.
const visible = computed(() => {
  if (!mounted.value || isInstalled.value) return false
  if (!props.dismissible) return true
  return !dismissed.value && installGuide.value.platform !== 'desktop'
})

function refreshInstallState() {
  isInstalled.value = isRunningStandalone()
}

function dismiss() {
  dismissed.value = true
  localStorage.setItem(DISMISS_KEY, '1')
  $posthog?.capture('pwa_install_card_dismissed', { platform: installGuide.value.platform })
}

function onBeforeInstallPrompt(event: Event) {
  event.preventDefault()
  deferredInstallEvent.value = event as BeforeInstallPromptEvent
}

function onAppInstalled() {
  deferredInstallEvent.value = null
  showInstallSheet.value = false
  refreshInstallState()
  $posthog?.capture('pwa_installed')
}

async function openInstallHelper() {
  if (!deferredInstallEvent.value) {
    showInstallSheet.value = true
    $posthog?.capture('pwa_install_instructions_opened', { platform: installGuide.value.platform })
    return
  }

  await deferredInstallEvent.value.prompt()
  const choice = await deferredInstallEvent.value.userChoice
  $posthog?.capture('pwa_install_prompt_result', { outcome: choice?.outcome ?? 'unknown' })
  deferredInstallEvent.value = null
  refreshInstallState()
  // If they declined Chrome's prompt, don't follow up with the manual steps.
}

onMounted(() => {
  installGuide.value = getInstallGuide(window.navigator.userAgent, {
    isTouchMac: window.navigator.maxTouchPoints > 1,
  })
  dismissed.value = localStorage.getItem(DISMISS_KEY) === '1'
  refreshInstallState()
  mounted.value = true
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.removeEventListener('appinstalled', onAppInstalled)
})
</script>

<style scoped>
.install-helper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;

  & .install-app-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  & .install-copy {
    flex: 1;
    min-width: 0;
  }

  & .install-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  & .install-hint {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: 2px;
    line-height: 1.4;
  }

  & .install-action {
    flex-shrink: 0;
    font-size: 0.8125rem;
    font-weight: 700;
    font-family: var(--font-body);
    color: var(--color-text-inverse);
    background: var(--tpl-blue);
    border: none;
    border-radius: var(--radius-pill);
    padding: 9px 14px;
    cursor: pointer;
  }

  & .install-dismiss {
    flex-shrink: 0;
    display: flex;
    color: var(--color-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    margin-right: -4px;
  }
}

.install-sheet {
  padding: 8px 0 calc(16px + env(safe-area-inset-bottom));

  & .install-sheet-title {
    font-size: 1.125rem;
    margin-bottom: 16px;
    color: var(--color-text);
  }

  & .install-step-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  & .install-step {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
  }

  & .install-step-num {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-text-inverse);
    background: var(--tpl-navy);
  }

  & .install-step-text {
    flex: 1;
    font-size: 0.875rem;
    color: var(--color-text-mid);
    line-height: 1.45;
  }

  & .install-step-icon {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: var(--tpl-blue);
    background: color-mix(in srgb, var(--tpl-blue) 10%, transparent);

    & svg {
      width: 20px;
      height: 20px;
    }
  }

  & .install-fallback {
    margin-top: 14px;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    line-height: 1.45;
  }
}
</style>
