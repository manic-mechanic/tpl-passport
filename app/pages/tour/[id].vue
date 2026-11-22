<template>
  <main class="page-content" :style="{ '--route-color': tour.color, '--route-on': textOnColor(tour.color) }">
    <PageBanner :title="tour.title" back-label="Day trips" back-to="/explore?tab=routes&mode=transit" />

    <ol ref="stopsList" class="stops">
      <!-- Walk the route's own order so each leg stays between the two
           branches it describes, even if one were missing from the branch list -->
      <template v-for="(stop, i) in route" :key="stop.code">
        <li v-if="stop.branch" class="stop">
          <BranchCard :branch="stop.branch" :index="i + 1" as-button @select="openSheet" />
        </li>
        <!-- Each ride and where to board it; the last ride also says where the
             leg ends -->
        <li v-if="stop.branch && stop.next && stop.leg" class="leg" :class="{ 'leg-walk': !legRides(stop.leg).length }"
            :aria-label="`From ${stop.branch.BranchName} to ${stop.next.BranchName}`"
        >
          <span class="leg-rail" aria-hidden="true" />
          <div class="leg-body" :data-leg="i">
            <p v-for="(ride, r) in legRides(stop.leg)" :key="r" class="leg-ride leg-step">
              <TtcRouteBadge :mode="ride.mode" :line="ride.line ?? ''" :line-name="ride.lineName" />
              <span class="leg-stop">
                {{ stopLabel(ride.fromStop) }}<template v-if="r === legRides(stop.leg).length - 1">
                  → {{ stopLabel(ride.toStop) }}</template>
              </span>
              <TourDirectionsLink v-if="linkInRow(i, r, legRides(stop.leg).length)" class="leg-link-inline"
                                  :href="transitDirectionsUrl(stop.branch, stop.next)" :route-id="tour.id" :leg="i + 1"
              />
            </p>
            <p v-if="!legRides(stop.leg).length" class="leg-ride">
              <span class="ttc-route leg-walk-icon" role="img" aria-label="Walk"><TtcModeIcon mode="WALK" /></span>
              <span class="leg-stop">{{ walkingLabel(stop.leg) }}</span>
              <TourDirectionsLink v-if="linkInRow(i, 0, 1)" class="leg-link-inline"
                                  :href="transitDirectionsUrl(stop.branch, stop.next)" :route-id="tour.id" :leg="i + 1"
              />
            </p>
            <TourDirectionsLink v-if="(linkSpot[i] ?? 'own') === 'own'" class="leg-link-own"
                                :href="transitDirectionsUrl(stop.branch, stop.next)" :route-id="tour.id" :leg="i + 1"
            />
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
import { branchesByCode } from '~/composables/useRegion'
import { usePassportStore } from '~/stores/passport'
import {
  getTourRoute,
  legRides,
  stopLabel,
  textOnColor,
  tourStops,
  transitDirectionsUrl,
  walkingLabel,
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
onMounted(() => {
  const visited = stops.filter(b => passport.hasVisited(b.BranchCode)).length
  $posthog?.capture('tour_route_viewed', { route_id: tour.id, visited })
})

const sheetOpen = ref(false)
const activeBranch = ref<Branch | null>(null)
const sheetHeight = 'calc(100svh - var(--nav-height) - 60px)'

// Where each leg's Directions link goes: at the end of the first ride's line
// if it fits there, else at the end of the last ride's line, else on a line
// of its own under the rides.
type LinkSpot = 'first' | 'last' | 'own'
const stopsList = ref<HTMLElement | null>(null)
const linkSpot = ref<Record<number, LinkSpot>>({})

function linkInRow(leg: number, row: number, rows: number): boolean {
  const spot = linkSpot.value[leg]
  return (spot === 'first' && row === 0) || (spot === 'last' && row === rows - 1)
}

let measureCtx: CanvasRenderingContext2D | null = null
function textWidth(el: HTMLElement): number {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  if (!measureCtx) return Infinity
  const cs = getComputedStyle(el)
  measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  return measureCtx.measureText((el.textContent ?? '').replace(/\s+/g, ' ').trim()).width
}

const ROW_GAP = 6 // between badge, stop and link, as .leg-ride's gap
const LINK_INSET = 6 // .leg-link's right margin
function placeLinks() {
  const list = stopsList.value
  const anyLink = list?.querySelector<HTMLElement>('.leg-link')
  if (!list || !anyLink) return
  const linkWidth = anyLink.getBoundingClientRect().width
  const fits = (row: HTMLElement | undefined, width: number) => {
    const stop = row?.querySelector<HTMLElement>('.leg-stop')
    if (!row || !stop) return false
    const badge = row.querySelector<HTMLElement>('.ttc-route')
    const need = (badge ? badge.getBoundingClientRect().width + ROW_GAP : 0) + textWidth(stop) + ROW_GAP * 2 + linkWidth + LINK_INSET
    return need <= width
  }
  const next: Record<number, LinkSpot> = {}
  list.querySelectorAll<HTMLElement>('.leg-body').forEach((body) => {
    const rows = [...body.querySelectorAll<HTMLElement>('.leg-ride')]
    next[Number(body.dataset.leg)] = fits(rows[0], body.clientWidth)
      ? 'first'
      : fits(rows.at(-1), body.clientWidth) ? 'last' : 'own'
  })
  linkSpot.value = next
}

onMounted(() => {
  void nextTick(placeLinks)
  void document.fonts?.ready.then(placeLinks)
  window.addEventListener('resize', placeLinks)
})
onUnmounted(() => window.removeEventListener('resize', placeLinks))

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

/* The tour's line runs down the left; every ride on it gets an empty circle,
   centred on the line. A leg that's only walking is a dashed line. */
.leg {
  --rail: 2px;
  --rail-gap: 14px;
  --dot: 10px;

  display: flex;
  align-items: stretch;
  gap: var(--rail-gap);
  padding: 0 0 0 23px;
}

.leg-rail {
  flex-shrink: 0;
  width: var(--rail);
  margin: 2px 0;
  background: var(--route-color);
}

.leg-walk .leg-rail {
  background: repeating-linear-gradient(to bottom, var(--route-color) 0 4px, transparent 4px 8px);
}

.leg-walk-icon {
  display: inline-flex;
  align-items: center;
  height: 18px;
  color: var(--color-text);
}

.leg-step {
  position: relative;
}

.leg-step::before {
  content: '';
  position: absolute;
  /* centred on the route badge, which sits 1px above the text's centre */
  top: calc((16px - var(--dot)) / 2);
  left: calc(-1 * (var(--rail-gap) + var(--rail) / 2 + var(--dot) / 2));
  box-sizing: border-box;
  width: var(--dot);
  height: var(--dot);
  border: 2px solid var(--route-color);
  border-radius: 50%;
  background: var(--color-bg);
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
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
  font-size: 0.75rem;
  line-height: 18px;
}

.leg-stop {
  color: var(--color-text-mid);
}

.leg-link-inline {
  margin-left: auto;
}

/* Directions keeps a little room from the right edge */
.leg-body :deep(.leg-link) {
  margin-right: 6px;
}

.leg-link-own {
  align-self: flex-start;
}
</style>
