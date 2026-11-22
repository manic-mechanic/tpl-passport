<template>
  <main class="page-content" :style="{ '--route-color': tour.color, '--route-on': textOnColor(tour.color) }">
    <PageBanner :title="tour.title" back-label="Day trips" back-to="/explore?tab=routes&mode=transit" />

    <ol class="stops">
      <!-- Walk the route's own order so each leg stays between the two
           branches it describes, even if one were missing from the branch list -->
      <template v-for="(stop, i) in route" :key="stop.code">
        <li v-if="stop.branch" class="stop">
          <BranchCard :branch="stop.branch" :index="i + 1" as-button @select="openSheet" />
        </li>
        <!-- The ride from this branch to the next, drawn as a transit-map
             line: each ride's last stop, transfers as open circles, and a
             dotted line for a leg that's all walking -->
        <li v-if="stop.branch && stop.next && stop.leg" class="leg"
            :class="{ 'leg-walk': !legRides(stop.leg).length }"
            :aria-label="`From ${stop.branch.BranchName} to ${stop.next.BranchName}`"
        >
          <span class="leg-rail" aria-hidden="true" />
          <div class="leg-body">
            <template v-for="(row, r) in legRows(stop.leg)" :key="r">
              <p class="leg-ride" :class="{ 'leg-transfer': r > 0 }">
                <TtcRouteBadge v-if="row" :mode="row.mode" :line="row.line ?? ''" :line-name="row.lineName" />
                <span class="leg-dest">
                  <span v-if="row" class="leg-stop">{{ shortStopName(row.toStop) }}</span>
                  <a v-if="r === legRows(stop.leg).length - 1" :href="transitDirectionsUrl(stop.branch, stop.next)"
                     target="_blank" rel="noopener" class="leg-link" aria-label="Directions (opens another site)"
                     @click="$posthog?.capture('tour_directions_tapped', { route_id: tour.id, leg: i + 1 })"
                  >
                    Directions<IconExternal class="external-icon" aria-hidden="true" />
                  </a>
                </span>
              </p>
            </template>
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
  getTourRoute,
  legRides,
  shortStopName,
  textOnColor,
  tourStops,
  transitDirectionsUrl,
  type TourSegment,
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
// One row per ride, or a single walking row (null) when the leg has no rides.
function legRows(leg: TourSegment[]): (TourSegment | null)[] {
  const rides = legRides(leg)
  return rides.length ? rides : [null]
}

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

/* The tour's line, in its own colour, running from one branch to the next,
   with a station dot where it meets each branch */
.leg-rail {
  position: relative;
  flex-shrink: 0;
  width: 4px;
  margin: 6px 0;
  border-radius: 2px;
  background: var(--route-color);

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    width: 10px;
    height: 10px;
    margin-left: -5px;
    border-radius: 50%;
    background: var(--route-color);
  }

  &::before {
    top: -5px;
  }

  &::after {
    bottom: -5px;
  }
}

/* All walking: a dotted line instead of a solid one */
.leg-walk .leg-rail {
  background: none;
  border-left: 4px dotted var(--route-color);
  border-radius: 0;

  /* centre the station dots on the dotted border */
  &::before,
  &::after {
    left: -2px;
  }
}

.leg-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
}

.leg-ride {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
  font-size: 0.75rem;
  line-height: 18px;
}

/* A transfer: an open circle on the line, like an interchange on a map */
.leg-transfer::before {
  content: '';
  position: absolute;
  /* centred on the rail: 12px gap + 2px half-rail + 5px half-circle */
  left: -19px;
  top: 4px;
  width: 10px;
  height: 10px;
  border: 2.5px solid var(--route-color);
  border-radius: 50%;
  background: var(--color-bg);
  box-sizing: border-box;
}

/* The stop and the Directions link share a line when they fit; otherwise
   the link wraps to sit directly under the stop. */
.leg-dest {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  column-gap: 10px;
}

.leg-stop {
  color: var(--color-text-mid);
}

.leg-link {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
