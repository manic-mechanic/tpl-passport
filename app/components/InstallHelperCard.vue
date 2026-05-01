<template>
  <div v-if="!isInstalled" class="install-helper card">
    <div class="install-helper-content">
      <div>
        <span class="install-title">Add to Home Screen</span>
        <p class="install-hint">{{ installHint }}</p>
      </div>
      <button class="install-action" @click="openInstallHelper">
        {{ installActionLabel }}
      </button>
    </div>
  </div>

  <BaseSheet
    v-model:open="showInstallSheet"
    height="62dvh"
    aria-label="Install app instructions"
  >
    <div class="install-sheet">
      <h2 class="install-sheet-title">{{ installGuide.title }}</h2>
      <div v-if="installGuide.platform === 'ios'" class="ios-steps-preview">
        <div class="ios-shot">
          <span class="ios-shot-label">1. Tap Share</span>
          <span class="ios-shot-icon">⬆︎</span>
        </div>
        <div class="ios-shot">
          <span class="ios-shot-label">2. Add to Home Screen</span>
          <span class="ios-shot-icon">＋</span>
        </div>
      </div>
      <ol class="install-step-list">
        <li v-for="step in installGuide.steps" :key="step" class="install-step">
          {{ step }}
        </li>
      </ol>
    </div>
  </BaseSheet>
</template>

<script setup>
import { getInstallGuide, isRunningStandalone } from '~/lib/installHelper'

const { $posthog } = useNuxtApp()

const deferredInstallEvent = ref(null)
const isInstalled = ref(false)
const showInstallSheet = ref(false)
const installGuide = ref({ title: 'Install this app', platform: 'other', steps: [] })
const isAndroidGuide = computed(() => installGuide.value.platform === 'android')

const canPromptInstall = computed(() => Boolean(deferredInstallEvent.value))
const installActionLabel = computed(() => {
  if (canPromptInstall.value) return 'Install'
  if (isAndroidGuide.value) return 'Install'
  return 'How to install'
})
const installHint = computed(() =>
  canPromptInstall.value
    ? 'Install in one tap on this device.'
    : isAndroidGuide.value
      ? 'Tap Install to open Android install steps.'
      : 'We will show quick install steps for your browser.',
)

function refreshInstallState() {
  isInstalled.value = isRunningStandalone()
}

function onBeforeInstallPrompt(event) {
  event.preventDefault()
  deferredInstallEvent.value = event
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
    $posthog?.capture('pwa_install_instructions_opened')
    return
  }

  await deferredInstallEvent.value.prompt()
  const choice = await deferredInstallEvent.value.userChoice
  $posthog?.capture('pwa_install_prompt_result', { outcome: choice?.outcome ?? 'unknown' })
  deferredInstallEvent.value = null
  refreshInstallState()

  if (!isInstalled.value) {
    showInstallSheet.value = true
  }
}

onMounted(() => {
  installGuide.value = getInstallGuide(window.navigator.userAgent)
  refreshInstallState()
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
  overflow: hidden;

  & .install-helper-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
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
    min-width: 100px;
    font-size: 0.875rem;
    font-weight: 700;
    font-family: var(--font-body);
    color: var(--color-text-inverse);
    background: var(--tpl-blue);
    border: none;
    border-radius: var(--radius-pill);
    padding: 12px;
    cursor: pointer;
  }
}

.install-sheet {
  padding-top: 8px;

  & .ios-steps-preview {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }

  & .ios-shot {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    justify-content: center;
    min-height: 80px;
  }

  & .ios-shot-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-mid);
    text-align: center;
    line-height: 1.3;
  }

  & .ios-shot-icon {
    font-size: 1rem;
    color: var(--tpl-blue);
  }

  & .install-sheet-title {
    font-size: 1rem;
    margin-bottom: 12px;
    color: var(--color-text);
  }

  & .install-step-list {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  & .install-step {
    font-size: 0.875rem;
    color: var(--color-text-mid);
    line-height: 1.5;
  }
}
</style>
