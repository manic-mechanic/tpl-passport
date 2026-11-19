<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { useAuthKnown, useSignedIn } from '~/composables/useAuthState'
import { usePassportStore } from '~/stores/passport'
import { useIsDark } from '~/composables/useIsDark'

const passport = usePassportStore()

// iOS can drop the seal image in the sticky top bar when the theme changes
// (it stays blank until a reload), so re-create it on each change.
const isDark = useIsDark()

const isSignedIn = useSignedIn()
const authKnown = useAuthKnown()
const bannerDismissed = ref(false)

onMounted(() => {
  bannerDismissed.value = localStorage.getItem('signin_banner_dismissed') === '1'
})

// Wait until app.vue has checked the session so signed-in users never see it flash.
const showBanner = computed(() =>
  authKnown.value && !isSignedIn.value && passport.checkIns.length > 0 && !bannerDismissed.value
)

const branchSheetOpen = ref(false)
const activeBranch = ref<Branch | null>(null)
const branchSheetHeight = 'calc(100svh - var(--nav-height) - 60px)'

function dismissBanner() {
  bannerDismissed.value = true
  localStorage.setItem('signin_banner_dismissed', '1')
}

function openBranchSheet(branch: Branch) {
  activeBranch.value = branch
  branchSheetOpen.value = true
}
</script>

<template>
  <main class="page-content">
    <div class="home-top-bar">
      <img :key="isDark ? 'dark' : 'light'" src="/tpl-meta-card.png" class="top-bar-seal" alt="" aria-hidden="true" />
      <p class="top-bar-wordmark">passport<span>:</span></p>
    </div>

    <PassportCard class="home-passport" />

    <!-- Prompts sit below the passport so first-time users see their passport first.
         One at a time: sign-in (protects their check-ins) wins over install. -->
    <div class="home-prompts">
      <div v-if="showBanner" class="signin-banner">
        <div class="signin-banner__body">
          <p class="signin-banner__text">Save your progress — access your passport on any device</p>
          <NuxtLink to="/login" class="signin-banner__link">Sign in</NuxtLink>
        </div>
        <button class="signin-banner__dismiss" aria-label="Dismiss" @click="dismissBanner">✕</button>
      </div>
      <InstallHelperCard v-else-if="authKnown" dismissible hide-on-desktop />
    </div>

    <RecentVisits @select="openBranchSheet" />

    <HomeBadgesStrip />
  </main>

  <BaseSheet v-model:open="branchSheetOpen" :height="branchSheetHeight">
    <BranchDetail v-if="activeBranch" :branch="activeBranch" source="home" @open-branch="openBranchSheet" />
  </BaseSheet>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.home-top-bar {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 10;
  margin: 0 -18px;
  /* Same height as PageBanner, so switching tabs doesn't shift the page */
  padding: var(--banner-pad-top) 18px var(--banner-pad-bottom);
  min-height: calc(var(--banner-pad-top) + var(--banner-row-height) + var(--banner-pad-bottom));
  background: var(--tpl-navy);
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-bar-seal {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: contain;
  opacity: 0.85;
}

.top-bar-wordmark {
  flex: 1;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
  line-height: 1;
}

.top-bar-wordmark span {
  color: rgba(255, 255, 255, 0.55);
}


.signin-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: color-mix(in srgb, var(--tpl-blue) 8%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--tpl-blue) 22%, transparent);
  border-radius: var(--radius);
}

.home-passport {
  margin-top: -8px;
}

.home-prompts {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &:empty {
    display: none;
  }
}

.signin-banner__body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.signin-banner__text {
  font-size: 0.875rem;
  color: var(--color-text-mid);
  line-height: 1.4;
}

.signin-banner__link {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--tpl-blue);
  white-space: nowrap;
  flex-shrink: 0;
}

.signin-banner__dismiss {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  flex-shrink: 0;
}

:deep(.badges-strip) {
  margin-top: -10px;
}
</style>
