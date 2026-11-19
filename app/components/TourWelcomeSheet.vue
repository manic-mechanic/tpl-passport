<template>
  <BaseSheet v-model:open="open" aria-label="Welcome to TPL Passport">
    <div class="welcome">
      <h2 class="welcome-title">Welcome to TPL Passport</h2>
      <p class="welcome-text">
        TPL Passport is a free companion to
        <strong class="welcome-event">Next Stop: Your Library Tour</strong>
      </p>
      <ul class="welcome-points">
        <li>Visit branches, collect stamps, and see your passport fill up.</li>
        <li>Plan your trip with routes designed by School of Cities.</li>
        <li>Visit every location by {{ TOUR_END_LABEL }} to complete the {{ LIBRARY_TOUR.hashtag }} challenge.</li>
      </ul>
      <button type="button" class="welcome-primary" @click="close('dismissed')">
        Start exploring
      </button>
      <NuxtLink to="/explore?tab=routes" class="welcome-secondary" @click="close('routes')">
        See the routes
      </NuxtLink>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
import { LIBRARY_TOUR, TOUR_END_LABEL, isTourOn, isTourReferral } from '~/lib/libraryTour'

// Shown once to people who arrive from the Your Library Tour event page.
const SEEN_KEY = 'tour_welcome_seen'

const { $posthog } = useNuxtApp()
const router = useRouter()
const open = ref(false)

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Private mode etc.: the sheet may show again next time, which is fine.
  }
}

// Sets a per-tab flag and returns whether it was already set.
function sessionFlag(key: string): boolean {
  try {
    if (sessionStorage.getItem(key) === '1') return true
    sessionStorage.setItem(key, '1')
  } catch {
    // Storage unavailable: count it.
  }
  return false
}

function close(action: 'routes' | 'dismissed') {
  $posthog?.capture('tour_welcome_closed', { action })
  open.value = false
}

// Swiping the sheet away counts as seen too
watch(open, (isOpen) => {
  if (!isOpen) markSeen()
})

onMounted(async () => {
  await router.isReady()
  const route = router.currentRoute.value
  if (!isTourReferral(route.query, document.referrer)) return

  // Once per visit: document.referrer survives a reload, so a referred
  // visitor would otherwise be counted again on every refresh.
  if (!sessionFlag('tour_referral_tracked')) {
    $posthog?.capture('tour_referral_landed', { via: route.query.ref ? 'link' : 'referrer', path: route.path })
  }

  // Keep shared and bookmarked URLs clean
  if (route.query.ref !== undefined) {
    const { ref: _ref, ...query } = route.query
    await router.replace({ query })
  }

  if (readSeen() || !isTourOn()) return
  // After the passport cover animation (app.vue)
  setTimeout(() => { open.value = true }, 1000)
})
</script>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 20px 24px;
}

.welcome-title {
  font-size: 1.5rem;
  line-height: 1.2;
}

.welcome-text {
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-text-mid);
}

.welcome-event {
  display: block;
  white-space: nowrap;
}

.welcome-points {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 18px;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--color-text-mid);
}

.welcome-primary {
  display: block;
  width: 100%;
  border: none;
  font: inherit;
  cursor: pointer;
  margin-top: 8px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  font-weight: 600;
  text-align: center;
  text-decoration: none;
}

.welcome-secondary {
  padding: 12px 16px;
  font-weight: 600;
  text-align: center;
  color: var(--color-accent);
  text-decoration: none;
}
</style>
