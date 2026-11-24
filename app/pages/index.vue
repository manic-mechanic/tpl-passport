<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { useAuthSettled, useSignedIn } from '~/composables/useAuthState'
import { usePassportStore } from '~/stores/passport'
import { useIsDark } from '~/composables/useIsDark'
import {
  ensureArms, homeStage, isPassportMade, markSheetSeen, sheetSeen,
  type OnboardingArms,
} from '~/lib/onboarding'

const { $posthog } = useNuxtApp()
const passport = usePassportStore()

// ── First steps (#82, #83) ───────────────────────────────────────────
// Until someone checks in or makes a passport, Home is two panels: "Check
// in" and "Make your passport". After one, the passport card comes back and
// the other step keeps its own panel. After both, the regular Home.
const stage = computed(() => homeStage(passport.checkIns.length, isPassportMade(passport.profile)))
// Assigned by the posthog plugin on a first visit; null for people who had
// started before the tests did.
const arms: OnboardingArms | null = ensureArms(stage.value)
const armProps = arms ? { ...arms } : {}
const checkInFirst = computed(() => arms?.onb_home_order !== 'passport_first')

const sheetOpen = ref(false)
let sheetTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  if (stage.value !== 'new') return
  const showSheet = arms?.onb_sheet === 'sheet' && !sheetSeen()
  $posthog?.capture('onboarding_shown', { ...armProps })
  if (!showSheet) return
  // After the passport cover (app.vue), and not over the Library Tour
  // welcome, which takes the first visit of people the tour sent here.
  sheetTimer = setTimeout(() => {
    let tourVisit = false
    try {
      tourVisit = sessionStorage.getItem('tour_referral_tracked') === '1'
    } catch { /* storage blocked */ }
    if (!tourVisit && stage.value === 'new') sheetOpen.value = true
  }, 1000)
})
onUnmounted(() => clearTimeout(sheetTimer))

watch(sheetOpen, (open) => {
  if (!open) markSheetSeen()
})

function panelTapped(panel: 'checkin' | 'passport', surface: 'home' | 'sheet' = 'home') {
  $posthog?.capture('home_panel_tapped', { panel, surface, stage: stage.value, ...armProps })
}

// iOS can drop the seal image in the sticky top bar when the theme changes
// (it stays blank until a reload), so re-create it on each change.
const isDark = useIsDark()

const isSignedIn = useSignedIn()
const authSettled = useAuthSettled()
const bannerDismissed = ref(false)

onMounted(() => {
  bannerDismissed.value = localStorage.getItem('signin_banner_dismissed') === '1'
})

// Wait for an answer about the session (the last visit's, or the server's)
// so signed-in users never see it flash.
const showBanner = computed(() =>
  authSettled.value && !isSignedIn.value && passport.checkIns.length > 0 && !bannerDismissed.value
)
// The install card shares the banner's slot. Without check-ins the banner
// can't show, so the card doesn't need to wait for the session.
const promptsReady = computed(() => authSettled.value || passport.checkIns.length === 0)

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

    <!-- First visit: the two first steps, no empty passport card -->
    <div v-if="stage === 'new'" class="first-steps" :class="{ 'first-steps--passport-first': !checkInFirst }">
      <HomeCheckInPanel :variant="checkInFirst ? 'large' : 'small'" class="first-step first-step--checkin"
                        @tap="panelTapped('checkin')"
      />
      <HomePassportPanel :variant="checkInFirst ? 'small' : 'large'" class="first-step first-step--passport"
                         @tap="panelTapped('passport')"
      />
    </div>

    <template v-else>
      <PassportCard class="home-passport" />

      <HomeCheckInPanel v-if="stage === 'passport'" variant="medium" @tap="panelTapped('checkin')" />
      <HomePassportPanel v-if="stage === 'checkedIn'" variant="row" @tap="panelTapped('passport')" />
    </template>

    <!-- Prompts sit below the passport so first-time users see their passport first.
         One at a time: sign-in (protects their check-ins) wins over install. -->
    <div v-if="stage !== 'new'" class="home-prompts">
      <div v-if="showBanner" class="signin-banner">
        <div class="signin-banner__body">
          <p class="signin-banner__text">Save your progress and open your passport on any device</p>
          <NuxtLink to="/login" class="signin-banner__link">Sign in</NuxtLink>
        </div>
        <button class="signin-banner__dismiss" aria-label="Dismiss" @click="dismissBanner">✕</button>
      </div>
      <InstallHelperCard v-else-if="promptsReady" dismissible hide-on-desktop />
    </div>

    <!-- Nothing to show here before the first check-in -->
    <template v-if="passport.checkIns.length">
      <RecentVisits @select="openBranchSheet" />

      <HomeBadgesStrip />
    </template>
  </main>

  <OnboardingSheet v-model:open="sheetOpen" @choose="panelTapped($event, 'sheet')" />

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

/* First visit: the large panel takes about two thirds of the screen under
   the top bar, the small one the rest */
.first-steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
  /* The screen under the top bar and above the nav, less the page's gaps.
     A minimum: on a short screen the panels keep their content and the
     page scrolls. */
  min-height: calc(100svh - var(--nav-height) - 98px - env(safe-area-inset-top));
  margin-top: -4px;
}

.first-steps--passport-first .first-step--passport {
  order: -1;
}

.first-step {
  flex: 1 0 auto;
}

.first-step--checkin:is(section),
.first-step--passport:is(section) {
  flex-grow: 2;
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
