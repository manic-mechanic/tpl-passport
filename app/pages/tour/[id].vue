<template>
  <main class="page-content" :style="{ '--route-color': tour.color, '--route-on': textOnColor(tour.color) }">
    <PageBanner :title="tour.title" back-label="Day trips" back-to="/explore?tab=routes&mode=transit">
      <template #sub>
        {{ formatMinutes(tour.travelMin) }} · {{ tour.walkKm }} km walking
      </template>
    </PageBanner>

    <div class="tour-progress-head">
      <span class="tour-chip">Route {{ tour.id }}</span>
      <span class="tour-progress-label">
        <template v-if="visited === stops.length">All {{ stops.length }} visited</template>
        <template v-else>{{ visited }} of {{ stops.length }} visited</template>
      </span>
    </div>

    <ol class="stops">
      <!-- Walk the route's own order so each leg stays between the two
           branches it describes, even if one were missing from the branch list -->
      <template v-for="(stop, i) in route" :key="stop.code">
        <li v-if="stop.branch" class="stop">
          <BranchCard :branch="stop.branch" :index="i + 1" as-button @select="openSheet" />
        </li>
        <li v-if="stop.branch && stop.next && stop.leg" class="leg"
            :aria-label="`From ${stop.branch.BranchName} to ${stop.next.BranchName}`"
        >
          <span class="leg-rail" aria-hidden="true" />
          <div class="leg-body">
            <div class="leg-head">
              <span class="leg-time">
                {{ formatMinutes(legMinutes(stop.leg)) }}<template v-if="!legRides(stop.leg).length"> walk</template>
              </span>
              <a :href="transitDirectionsUrl(stop.branch, stop.next)" target="_blank" rel="noopener" class="leg-link"
                 aria-label="Directions (opens another site)"
                 @click="$posthog?.capture('tour_directions_tapped', { route_id: tour.id, leg: i + 1 })"
              >
                Directions<IconExternal class="external-icon" aria-hidden="true" />
              </a>
            </div>
            <!-- One line per ride: vehicle, route number, and where to board -->
            <p v-for="(ride, r) in legRides(stop.leg)" :key="r" class="leg-ride">
              <TtcRouteBadge :mode="ride.mode" :line="ride.line ?? ''" :line-name="ride.lineName" />
              <span class="leg-stop">{{ shortStopName(ride.fromStop) }}</span>
            </p>
          </div>
        </li>
      </template>
    </ol>
  </main>

  <BaseSheet v-model:open="sheetOpen" :height="sheetHeight">
    <BranchDetail v-if="activeBranch" :branch="activeBranch" source="tour" @open-branch="openSheet" />
  </BaseSheet>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import IconExternal from '~/components/icons/IconExternal.vue'
import { branchesByCode } from '~/composables/useRegion'
import { usePassportStore } from '~/stores/passport'
import {
  formatMinutes,
  getTourRoute,
  legMinutes,
  legRides,
  shortStopName,
  textOnColor,
  tourStops,
  transitDirectionsUrl,
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

const route = tourStops(tour, branchesByCode)
const stops = route.flatMap(s => (s.branch ? [s.branch] : []))
const visited = computed(() => stops.filter(b => passport.hasVisited(b.BranchCode)).length)

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

.tour-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 20px;
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
  flex-direction: column;
  gap: 4px;
  padding: 10px 0;
}

.leg-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.leg-time {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text);
}

.leg-ride {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 0.75rem;
}

.leg-stop {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-muted);
}

.leg-link {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
