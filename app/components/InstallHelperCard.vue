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
const installGuide = ref({ title: 'Install this app', steps: [] })

const canPromptInstall = computed(() => Boolean(deferredInstallEvent.value))
const installActionLabel = computed(() => (canPromptInstall.value ? 'Install' : 'How to install'))
const installHint = computed(() =>
  canPromptInstall.value
    ? 'Install in one tap on this device.'
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
