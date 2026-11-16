<template>
  <main class="page-content" :style="{ '--route-color': tour.color, '--route-on': textOnColor(tour.color) }">
    <PageBanner :title="tour.title" back-label="Library Tour" back-to="/explore?tab=routes&mode=transit">
      <template #sub>
        Route {{ tour.id }} · {{ formatMinutes(tour.travelMin) }} · {{ tour.rides }} rides · {{ tour.walkKm }} km walking
      </template>
    </PageBanner>

    <section class="tour-progress-card">
      <div class="tour-progress-head">
        <span class="tour-chip">Route {{ tour.id }}</span>
        <span class="tour-progress-label">
          <template v-if="visited === stops.length">All {{ stops.length }} visited</template>
          <template v-else>{{ visited }} of {{ stops.length }} visited</template>
        </span>
      </div>
      <div class="tour-progress-bar" role="progressbar" :aria-valuenow="visited" aria-valuemin="0" :aria-valuemax="stops.length">
        <span :style="{ width: `${Math.round(visited / stops.length * 100)}%` }" />
      </div>
      <p class="tour-hint">Times are by TTC from one branch to the next. Tap a branch for hours and events.</p>
    </section>

    <ol class="stops">
      <template v-for="(b, i) in stops" :key="b.BranchCode">
        <li class="stop">
          <BranchCard :branch="b" :index="i + 1" as-button @select="openSheet" />
        </li>
        <li v-if="tour.legs[i] && stops[i + 1]" class="leg" :aria-label="`From ${b.BranchName} to ${stops[i + 1]!.BranchName}`">
          <span class="leg-rail" aria-hidden="true" />
          <div class="leg-body">
            <p class="leg-summary">
              <span class="leg-time">{{ formatMinutes(legMinutes(tour.legs[i]!)) }}</span>
              <span v-for="(ride, r) in legRides(tour.legs[i]!)" :key="r" class="leg-ride">
                {{ MODE_ICON[ride.mode] }} {{ ride.lineName ?? ride.line }}
              </span>
              <span v-if="!legRides(tour.legs[i]!).length" class="leg-ride">🚶 Walk</span>
            </p>
            <a :href="transitDirectionsUrl(b, stops[i + 1]!)" target="_blank" rel="noopener" class="leg-link"
               @click="$posthog?.capture('tour_directions_tapped', { route_id: tour.id, leg: i + 1 })"
            >
              Directions
            </a>
          </div>
        </li>
      </template>
    </ol>

    <p class="tour-credit">
      Route from <a :href="LIBRARY_TOUR.url" target="_blank" rel="noopener">Next Stop: Your Library Tour</a>
      by the School of Cities, University of Toronto. {{ LIBRARY_TOUR.hashtag }}
    </p>
  </main>

  <BaseSheet v-model:open="sheetOpen" :height="sheetHeight">
    <BranchDetail v-if="activeBranch" :branch="activeBranch" source="tour" @open-branch="openSheet" />
  </BaseSheet>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { branchesByCode } from '~/composables/useRegion'
import { usePassportStore } from '~/stores/passport'
import {
  LIBRARY_TOUR,
  formatMinutes,
  getTourRoute,
  legMinutes,
  legRides,
  textOnColor,
  transitDirectionsUrl,
  type TourMode,
} from '~/lib/libraryTour'

// One Your Library Tour route: its ten branches in order, with the TTC
// rides between them.
const { $posthog } = useNuxtApp()
const passport = usePassportStore()
const nuxtRoute = useRoute()

const tour = getTourRoute(String(nuxtRoute.params.id))
if (!tour) {
  // fatal: on client-side navigation a non-fatal error would leave a blank page
  throw createError({ status: 404, statusText: 'Route not found', fatal: true })
}

const stops = tour.branches.map(code => branchesByCode[code]).filter((b): b is Branch => !!b)
const visited = computed(() => stops.filter(b => passport.hasVisited(b.BranchCode)).length)

const MODE_ICON: Record<TourMode, string> = { WALK: '🚶', BUS: '🚌', SUBWAY: '🚇', TRAM: '🚊' }

onMounted(() => {
  $posthog?.capture('tour_route_viewed', { route_id: tour.id, visited: visited.value })
})

const sheetOpen = ref(false)
const activeBranch = ref<Branch | null>(null)
const sheetHeight = 'calc(100svh - var(--nav-height) - 60px)'

function openSheet(branch: Branch) {
  activeBranch.value = branch
  sheetOpen.value = true
}
</script>

<style scoped>
.page-content {
  padding-bottom: calc(var(--nav-height) + 24px);
}

.tour-progress-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  margin-bottom: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-left: 4px solid var(--route-color);
  border-radius: var(--radius);
}

.tour-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tour-chip {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--route-on);
  background: var(--route-color);
  border-radius: 999px;
  padding: 2px 8px;
}

.tour-progress-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.tour-progress-bar {
  height: 6px;
  border-radius: 999px;
  background: var(--color-border-soft);
  overflow: hidden;

  & span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--route-color);
  }
}

.tour-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stops {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
}

.leg {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 0 0 0 22px;
}

.leg-rail {
  flex-shrink: 0;
  width: 4px;
  border-radius: 2px;
  background: var(--route-color);
  margin: 2px 0;
}

.leg-body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
}

.leg-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.leg-time {
  font-weight: 700;
  color: var(--color-text);
}

.leg-ride {
  white-space: nowrap;
}

.leg-link {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
}

.tour-credit {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}
</style>
