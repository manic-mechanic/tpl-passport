<template>
  <div v-if="visible" class="install-helper card">
    <img src="/icon-192.png" class="install-app-icon" alt="" aria-hidden="true" />
    <div class="install-copy">
      <span class="install-title">Add to Home Screen</span>
      <p class="install-hint">Open your passport in one tap, like an app.</p>
    </div>
    <button class="install-action" @click="openInstallHelper">
      {{ canPrompt ? 'Install' : 'Show me' }}
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
            <component :is="STEP_ICONS[step.icon]" />
          </span>
        </li>
      </ol>
      <p v-if="installGuide.fallback" class="install-fallback">{{ installGuide.fallback }}</p>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { getInstallGuide, isRunningStandalone } from '~/lib/installHelper'
import type { InstallGuide, InstallStepIcon } from '~/lib/installHelper'
import { promptInstall, useInstallPrompt } from '~/composables/useInstallPrompt'
import IconAddSquare from '~/components/icons/IconAddSquare.vue'
import IconClose from '~/components/icons/IconClose.vue'
import IconInstall from '~/components/icons/IconInstall.vue'
import IconMenuVertical from '~/components/icons/IconMenuVertical.vue'
import IconMoreHorizontal from '~/components/icons/IconMoreHorizontal.vue'
import IconShare from '~/components/icons/IconShare.vue'

const props = withDefaults(defineProps<{
  // Show a ✕ that hides the card for good on this device.
  dismissible?: boolean
  // Hide on computers, where installing matters less than on phones.
  hideOnDesktop?: boolean
}>(), {
  dismissible: false,
  hideOnDesktop: false,
})

const STEP_ICONS: Record<InstallStepIcon, Component> = {
  share: IconShare,
  add: IconAddSquare,
  menu: IconMenuVertical,
  more: IconMoreHorizontal,
  install: IconInstall,
}

const DISMISS_KEY = 'install_card_dismissed'

const { $posthog } = useNuxtApp()
const { canPrompt, installedThisSession } = useInstallPrompt()

const mounted = ref(false)
const runningStandalone = ref(false)
const dismissed = ref(false)
const showInstallSheet = ref(false)
const installGuide = ref<InstallGuide>({ title: 'Install this app', platform: 'other', steps: [] })

// Rendered only after mount, once we can check how the app is running.
const visible = computed(() => {
  if (!mounted.value || runningStandalone.value || installedThisSession.value) return false
  if (props.dismissible && dismissed.value) return false
  if (props.hideOnDesktop && installGuide.value.platform === 'desktop') return false
  return true
})

function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Storage blocked: the card stays hidden until the page reloads.
  }
  $posthog?.capture('pwa_install_card_dismissed', { platform: installGuide.value.platform })
}

function showSteps() {
  showInstallSheet.value = true
  $posthog?.capture('pwa_install_instructions_opened', { platform: installGuide.value.platform })
}

async function openInstallHelper() {
  if (!canPrompt.value) {
    showSteps()
    return
  }

  const outcome = await promptInstall()
  if (outcome) {
    $posthog?.capture('pwa_install_prompt_result', { outcome })
  } else {
    // The prompt failed to open: show the manual steps instead.
    showSteps()
  }
  // If they declined Chrome's prompt, don't follow up with the manual steps.
}

watch(installedThisSession, (installed) => {
  if (installed) showInstallSheet.value = false
})

onMounted(() => {
  installGuide.value = getInstallGuide(window.navigator.userAgent, {
    isTouchMac: window.navigator.maxTouchPoints > 1,
  })
  try {
    dismissed.value = localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    dismissed.value = false
  }
  runningStandalone.value = isRunningStandalone()
  mounted.value = true
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
