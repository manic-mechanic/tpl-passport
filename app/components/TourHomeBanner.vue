<template>
  <section v-if="visible" class="tour-banner" aria-labelledby="tour-banner-title">
    <div class="tour-banner__head">
      <p class="tour-banner__tag">{{ LIBRARY_TOUR.hashtag }}</p>
      <button type="button" class="tour-banner__dismiss" aria-label="Hide the Library Tour banner" @click="dismiss">
        ✕
      </button>
    </div>
    <h2 id="tour-banner-title" class="tour-banner__title">Next Stop: Your Library Tour</h2>

    <!-- One segment per route, in its colour, filled as you visit its branches -->
    <div class="tour-banner__routes" aria-hidden="true">
      <span v-for="p in progress" :key="p.route.id" class="tour-banner__route">
        <span :style="{ width: `${p.visited / p.total * 100}%`, background: p.route.color }" />
      </span>
    </div>

    <p class="tour-banner__text">
      <template v-if="next">
        Keep going on Route {{ next.route.id }}, {{ next.route.title }}: {{ next.visited }} of {{ next.total }} visited.
      </template>
      <template v-else-if="routesDone === progress.length">
        All ten routes done. Every branch is stamped.
      </template>
      <template v-else>
        Ten transit routes, ten branches each. Visit all 100 by {{ endLabel }} to go for gold.
      </template>
    </p>

    <NuxtLink :to="next ? `/tour/${next.route.id}` : '/explore?tab=routes&mode=transit'" class="tour-banner__cta"
              @click="$posthog?.capture('tour_banner_tapped', { route_id: next?.route.id ?? null })"
    >
      {{ next ? 'Open route' : 'See the routes' }} →
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
import { usePassportStore } from '~/stores/passport'
import { LIBRARY_TOUR, isTourOn, routeProgress, suggestedRoute, tourRoutes } from '~/lib/libraryTour'

// Home-page card for Next Stop: Your Library Tour, shown while the tour is on
// until dismissed.
const DISMISSED_KEY = 'tour_banner_dismissed'

const { $posthog } = useNuxtApp()
const passport = usePassportStore()

const dismissed = ref(true) // until read on mount, so it never flashes
onMounted(() => {
  try {
    dismissed.value = localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    dismissed.value = false
  }
})

const visible = computed(() => !dismissed.value && isTourOn())

const progress = computed(() => tourRoutes.map(r => routeProgress(r, passport.visitedBranchCodes)))
const routesDone = computed(() => progress.value.filter(p => p.complete).length)
const next = computed(() => suggestedRoute(passport.visitedBranchCodes))
const endLabel = new Date(`${LIBRARY_TOUR.endsOn}T12:00:00`).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })

function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // Private mode etc.: it'll show again next visit.
  }
  $posthog?.capture('tour_banner_dismissed')
}
</script>

<style scoped>
.tour-banner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--tpl-navy);
  color: rgba(255, 255, 255, 0.9);
}

.tour-banner__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tour-banner__tag {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.6);
}

.tour-banner__dismiss {
  padding: 4px;
  border: none;
  background: none;
  font-size: 0.75rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
}

.tour-banner__title {
  font-size: 1.125rem;
  color: #fff;
}

.tour-banner__routes {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 3px;
}

.tour-banner__route {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;

  & span {
    display: block;
    height: 100%;
  }
}

.tour-banner__text {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.8);
}

.tour-banner__cta {
  align-self: flex-start;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff;
  text-decoration: none;
}
</style>
