<template>
  <BaseSheet v-model:open="open" aria-label="Welcome, Library Tour traveller">
    <div class="welcome">
      <p class="welcome-tag">{{ LIBRARY_TOUR.hashtag }}</p>
      <h2 class="welcome-title">Welcome, Library Tour traveller</h2>
      <p class="welcome-text">
        This passport is a free companion to <strong>Next Stop: Your Library Tour</strong>.
        Check in at each branch you visit to collect its stamp, and watch your routes fill in.
      </p>
      <ul class="welcome-points">
        <li>All ten tour routes, with the TTC rides between stops</li>
        <li>A stamp for every branch, all 100 if you go for gold</li>
        <li>No account needed. Sign in any time to keep your stamps on every device</li>
      </ul>
      <NuxtLink to="/explore?tab=routes&mode=transit" class="welcome-primary" @click="close('routes')">
        See the 10 routes
      </NuxtLink>
      <button type="button" class="welcome-secondary" @click="close('dismissed')">
        Start exploring
      </button>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
import { LIBRARY_TOUR, isTourReferral } from '~/lib/libraryTour'

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

  $posthog?.capture('tour_referral_landed', { via: route.query.ref ? 'link' : 'referrer', path: route.path })

  // Keep shared and bookmarked URLs clean
  if (route.query.ref !== undefined) {
    const { ref: _ref, ...query } = route.query
    await router.replace({ query })
  }

  if (readSeen()) return
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

.welcome-tag {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--color-brand-text);
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
  border: none;
  background: none;
  font: inherit;
  font-weight: 600;
  color: var(--color-accent);
  cursor: pointer;
}
</style>
