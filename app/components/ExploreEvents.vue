<template>
  <div class="events-list">
    <!-- Day (prev/next around the date) and Filter, centred together -->
    <div class="events-controls">
      <div class="day-picker">
        <button class="day-step" :disabled="dayIndex <= 0" aria-label="Previous day" @click="stepDay(-1)">
          <IconChevron class="day-step-icon day-step-prev" />
        </button>
        <label class="day-current">
          <!-- Every option stacked in one cell, only the chosen one visible, so
               the box keeps the width of the longest and doesn't jump -->
          <span class="day-labels">
            <span :class="{ on: day === WEEK }">This week</span>
            <span v-for="d in days" :key="d" :class="{ on: day === d }">{{ longDate(d) }}</span>
          </span>
          <select class="overlay-select" aria-label="Day" :value="day" @change="pickDay(($event.target as HTMLSelectElement).value)">
            <option :value="WEEK">This week</option>
            <option v-for="d in days" :key="d" :value="d">{{ longDate(d) }}</option>
          </select>
        </label>
        <button class="day-step" :disabled="dayIndex >= days.length - 1" aria-label="Next day" @click="stepDay(1)">
          <IconChevron class="day-step-icon" />
        </button>
      </div>
      <button class="filter-btn" :class="{ active: activeFilterCount > 0 || sort !== 'time' }"
              :aria-label="activeFilterCount ? `Filter (${activeFilterCount} on)` : 'Filter'" @click="filtersOpen = true"
      >
        <IconFilter class="filter-icon" />
      </button>
    </div>
    <p v-if="locateError" class="events-note">{{ locateError }}</p>

    <div v-if="state === 'loading' || !state" class="geo-state">
      <span class="geo-spinner" />
      <span>Loading events…</span>
    </div>
    <p v-else-if="state === 'error'" class="events-note">
      Couldn't load events for {{ day === WEEK ? 'this week' : dayLabel(day) }}.
      <button class="text-btn" @click="retry">Try again</button>
    </p>
    <template v-else>
      <div v-for="event in shown" :key="event.id" class="event-row" :class="{ clickable: event.branch }"
           :role="event.branch ? 'button' : undefined" :tabindex="event.branch ? 0 : undefined"
           :aria-label="event.branch ? `${event.title}, ${event.locationName}. Open branch` : undefined"
           @click="event.branch && openBranch(event.branch)"
           @keydown.enter.self="event.branch && openBranch(event.branch)"
      >
        <div class="event-date" aria-hidden="true">
          <span class="event-month">{{ dateParts(event.date).month }}</span>
          <span class="event-day">{{ dateParts(event.date).day }}</span>
        </div>
        <div class="event-info">
          <p class="event-title">
            {{ event.title }}<a v-if="event.url" :href="event.url" target="_blank" rel="noopener" class="event-link"
                                :aria-label="`${event.title} on the TPL website (opens another site)`"
                                @click.stop="$posthog?.capture('whats_on_event_link_tapped', { title: event.title })"
                                @keydown.enter.stop
            ><IconExternal class="event-link-icon" aria-hidden="true" /></a>
          </p>
          <p class="event-meta">
            <StampDot v-if="event.branch" class="event-stamp" :branch-code="event.branch.BranchCode"
                      :ward-no="event.branch.WardNo" :visited="passport.hasVisited(event.branch.BranchCode)"
            />{{ [event.branch ? shortName(event.branch) : event.locationName, formatEventTime(event.start), formatAudiences(event.audiences)].filter(Boolean).join(' · ') }}
          </p>
        </div>
        <IconChevron v-if="event.branch" class="event-chevron" aria-hidden="true" />
      </div>

      <template v-if="shown.length === 0">
        <p v-if="dayEvents.length > 0" class="events-note">
          No events match these filters.
          <button class="text-btn" @click="clearFilters">Clear filters</button>
        </p>
        <p v-else class="events-note">
          {{ day === WEEK ? 'No events this week.' : day === today ? 'Nothing else on today.' : `No events on ${dayLabel(day)}.` }}
        </p>
        <button v-if="day !== WEEK && dayIndex < days.length - 1" class="events-load-more" @click="stepDay(1)">
          See {{ dayLabel(days[dayIndex + 1]!) }}
        </button>
      </template>
      <p v-if="failedDays.length" class="events-note">
        Couldn't load {{ failedDays.map(dayLabel).join(', ') }}.
        <button class="text-btn" @click="retry">Try again</button>
      </p>
    </template>
  </div>

  <!-- Filters -->
  <BaseSheet v-model:open="filtersOpen" aria-label="Filter events">
    <div class="filter-sheet">
      <h2 class="filter-title">Filter</h2>
      <div class="field">
        <label for="ev-age">Ages</label>
        <select id="ev-age" :value="age ?? ''" @change="setFilter('age', ($event.target as HTMLSelectElement).value)">
          <option value="">All ages</option>
          <option v-for="g in AGE_GROUPS" :key="g.id" :value="g.id">{{ g.label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="ev-time">Time</label>
        <select id="ev-time" :value="time ?? ''" @change="setFilter('time', ($event.target as HTMLSelectElement).value)">
          <option value="">Any time</option>
          <option v-for="t in TIMES_OF_DAY" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="ev-place">Branches</label>
        <select id="ev-place" :value="place" @change="setFilter('place', ($event.target as HTMLSelectElement).value)">
          <option value="">All branches</option>
          <option v-if="homeBranch" value="home">Home branch ({{ shortName(homeBranch) }})</option>
          <option v-if="access !== 'denied'" value="near">Near me</option>
          <optgroup v-for="group in placeGroups" :key="group.label" :label="group.label">
            <option v-for="o in group.options" :key="o.id" :value="o.id">{{ o.label }}</option>
          </optgroup>
        </select>
      </div>
      <div class="field">
        <label for="ev-sort">Sort</label>
        <select id="ev-sort" :value="sort" @change="setSort(($event.target as HTMLSelectElement).value as EventSort)">
          <option value="time">By time</option>
          <option v-if="access !== 'denied'" value="nearest">Nearest first</option>
        </select>
      </div>
      <p v-if="locating" class="events-note">Finding your location…</p>
      <p v-else-if="locateError" class="events-note">{{ locateError }}</p>
      <div class="filter-actions">
        <button class="text-btn" :disabled="activeFilterCount === 0 && sort === 'time'" @click="clearFilters(); sort = 'time'">Clear</button>
        <button class="done-btn" @click="filtersOpen = false">Show {{ shown.length }} {{ shown.length === 1 ? 'event' : 'events' }}</button>
      </div>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { haversineKm } from '@tpl-passport/shared'
import { physicalBranches, branchesByCode } from '~/composables/useRegion'
import { formatAudiences, formatEventTime } from '~/composables/useEvents'
import { reportError } from '~/lib/reportError'
import { getPosition, locationAccess, type LocationAccess } from '~/lib/geolocation'
import { tourRoutes } from '~/lib/libraryTour'
import { usePassportStore } from '~/stores/passport'
import routesData from '#data/routes.json'
import {
  AGE_GROUPS, TIMES_OF_DAY, addDays, branchLookup, isOver, matchesAge, sortEvents,
  timeOfDay, toExploreEvents, torontoNow,
  type AgeGroupId, type EventSort, type ExploreEvent, type RawEvent, type TimeOfDay,
} from '~/lib/exploreEvents'
import IconFilter from '~/components/icons/IconFilter.vue'
import IconChevron from '~/components/icons/IconChevron.vue'
import IconExternal from '~/components/icons/IconExternal.vue'

// What's On tab: a day of events across all branches, by Toronto date like
// /api/all-events, for the next week. Today's finished events are left out.
// Filters: ages, time of day, and which branches; sorted by time or nearest.
const props = withDefaults(defineProps<{
  userLat?: number | null
  userLng?: number | null
}>(), {
  userLat: null,
  userLng: null,
})
const emit = defineEmits<{ 'open-branch': [branch: Branch] }>()
const { $posthog } = useNuxtApp()
const passport = usePassportStore()

const DAYS = 7
const NEAR_COUNT = 5
const branches = branchLookup(physicalBranches)

// ── Clock ─────────────────────────────────────────────────────────────
// The tab is kept alive, so "now" ticks and the day list moves at midnight.
const now = ref(torontoNow())
const today = computed(() => now.value.slice(0, 10))
const days = computed(() => Array.from({ length: DAYS }, (_, i) => addDays(today.value, i)))

let timer: ReturnType<typeof setInterval> | undefined
function startClock() {
  now.value = torontoNow()
  clearInterval(timer)
  timer = setInterval(() => { now.value = torontoNow() }, 60_000)
}
function stopClock() {
  clearInterval(timer)
  timer = undefined
}

// ── Loading, a day at a time ──────────────────────────────────────────
const eventsByDay = ref<Record<string, ExploreEvent[]>>({})
const stateByDay = ref<Record<string, 'loading' | 'error' | 'done'>>({})

async function loadDay(d: string) {
  const offset = days.value.indexOf(d)
  if (offset < 0 || stateByDay.value[d] === 'loading') return
  stateByDay.value[d] = 'loading'
  try {
    const records: unknown = await $fetch('/api/all-events', { query: { offset, days: 1 } })
    const raw = (Array.isArray(records) ? records : []) as RawEvent[]
    eventsByDay.value[d] = toExploreEvents(raw.filter(r => r.StartDateLocal === d), branches)
    stateByDay.value[d] = 'done'
  } catch (error) {
    stateByDay.value[d] = 'error'
    reportError(error, { area: 'events', operation: 'all_events_window_fetch', offset, days: 1 })
  }
}

function ensureLoaded(d: string | undefined) {
  if (d && !stateByDay.value[d]) loadDay(d)
}

// ── Day ───────────────────────────────────────────────────────────────
// A single day, or the whole loaded week (WEEK), which sits before today
// in the list, so "next" from it goes to today.
const WEEK = 'week'
const day = ref(today.value)
const dayIndex = computed(() => days.value.indexOf(day.value))
const shownDays = computed(() => day.value === WEEK ? days.value : [day.value])

// The week is ready once every day has answered; failed days are noted
// under the list. One day shows its own state.
const state = computed(() => {
  const states = shownDays.value.map(d => stateByDay.value[d])
  if (states.some(s => !s || s === 'loading')) return 'loading'
  return states.every(s => s === 'error') ? 'error' : 'done'
})
const failedDays = computed(() =>
  day.value === WEEK ? days.value.filter(d => stateByDay.value[d] === 'error') : []
)

function retry() {
  shownDays.value.filter(d => stateByDay.value[d] === 'error').forEach(loadDay)
}

// Load what's shown and the next day, so stepping forward is instant.
watch(day, (d) => {
  shownDays.value.forEach(ensureLoaded)
  if (d !== WEEK) ensureLoaded(days.value[days.value.indexOf(d) + 1])
}, { immediate: true })

// A new day: drop what was loaded and move off a day that's gone.
watch(today, (t) => {
  eventsByDay.value = {}
  stateByDay.value = {}
  if (day.value !== WEEK && day.value < t) day.value = t
  shownDays.value.forEach(ensureLoaded)
})

// Opening in the evening with today all over: start on tomorrow instead.
const unwatchSkip = watch(() => stateByDay.value[today.value], (s) => {
  if (s !== 'done' && s !== 'error') return
  if (s === 'done' && day.value === today.value && dayEvents.value.length === 0) {
    day.value = days.value[1]!
  }
  unwatchSkip()
})

function pickDay(d: string) {
  if (d === WEEK || days.value.includes(d)) day.value = d
  $posthog?.capture('whats_on_day_changed', { day: d === WEEK ? 'week' : days.value.indexOf(d) })
}
function stepDay(by: number) {
  pickDay(days.value[dayIndex.value + by] ?? day.value)
}

// ── Location ──────────────────────────────────────────────────────────
// The Explore page passes a position when it has one without asking; "Near
// me" and "Nearest first" ask for one.
const access = ref<LocationAccess>('unknown')
const pos = ref<{ lat: number, lng: number } | null>(null)
const lat = computed(() => pos.value?.lat ?? props.userLat)
const lng = computed(() => pos.value?.lng ?? props.userLng)
const locating = ref(false)
const locateError = ref('')

async function locate(): Promise<boolean> {
  if (lat.value != null && lng.value != null) return true
  locating.value = true
  locateError.value = ''
  try {
    const p = await getPosition({ timeout: 20000 })
    pos.value = { lat: p.latitude, lng: p.longitude }
    return true
  } catch (err) {
    if ((err as GeolocationPositionError | undefined)?.code === 1) access.value = 'denied'
    locateError.value = access.value === 'denied'
      ? 'Location is off for this site, so events can\'t be sorted by distance.'
      : 'Couldn\'t find your location. Try again in a moment.'
    return false
  } finally {
    locating.value = false
  }
}

// ── Filters and sort ──────────────────────────────────────────────────
const age = ref<AgeGroupId | null>(null)
const time = ref<TimeOfDay | null>(null)
const place = ref('')
const sort = ref<EventSort>('time')
const activeFilterCount = computed(() => [age.value, time.value, place.value].filter(Boolean).length)
const filtersOpen = ref(false)

const homeBranch = computed(() => branchesByCode[passport.profile.homeBranch ?? ''] ?? null)

function shortName(b: Branch) {
  return b.BranchName.replace(/ Branch$/, '')
}

// Branch groups: the Library Tour routes, the walking day trips, districts.
const placeGroups = computed(() => [
  {
    label: 'Day trips',
    options: [
      ...tourRoutes.map(r => ({ id: `tour:${r.id}`, label: `Tour ${r.id}: ${r.title}`, codes: r.branches })),
      ...routesData.filter(r => r.mode === 'walk').map(r => ({ id: `walk:${r.id}`, label: `Walk: ${r.name}`, codes: r.branches })),
    ],
  },
  {
    label: 'Districts',
    options: [...new Set(physicalBranches.map(b => b.District))].sort().map(d => ({
      id: `district:${d}`, label: d, codes: physicalBranches.filter(b => b.District === d).map(b => b.BranchCode),
    })),
  },
])

const nearCodes = computed(() => {
  if (lat.value == null || lng.value == null) return []
  return physicalBranches
    .map(b => ({ code: b.BranchCode, km: haversineKm(lat.value!, lng.value!, b.Lat, b.Long) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, NEAR_COUNT)
    .map(x => x.code)
})

// The branch codes the place filter allows, or null for all.
const placeCodes = computed<Set<string> | null>(() => {
  if (!place.value) return null
  if (place.value === 'home') return new Set(homeBranch.value ? [homeBranch.value.BranchCode] : [])
  if (place.value === 'near') return new Set(nearCodes.value)
  const option = placeGroups.value.flatMap(g => g.options).find(o => o.id === place.value)
  return new Set(option?.codes ?? [])
})

async function setFilter(kind: 'age' | 'time' | 'place', value: string) {
  if (kind === 'age') age.value = (value || null) as AgeGroupId | null
  else if (kind === 'time') time.value = (value || null) as TimeOfDay | null
  else {
    if (value === 'near' && !(await locate())) return
    place.value = value
  }
  $posthog?.capture('whats_on_filter_changed', { filter: kind, value: value || 'all' })
}

function clearFilters() {
  age.value = null
  time.value = null
  place.value = ''
}

async function setSort(value: EventSort) {
  if (value === 'nearest' && !(await locate())) return
  sort.value = value
  $posthog?.capture('whats_on_sort_changed', { sort: sort.value })
}

function dateParts(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('en-CA', { month: 'short' }).replace('.', '').toUpperCase(),
    weekday: d.toLocaleDateString('en-CA', { weekday: 'short' }),
  }
}

// ── What's shown ──────────────────────────────────────────────────────
// The events still to come: today's that haven't ended, all of later days'.
const dayEvents = computed(() =>
  shownDays.value.flatMap(d => (eventsByDay.value[d] ?? []).filter(e => d !== today.value || !isOver(e, now.value)))
)

const shown = computed(() => {
  const codes = placeCodes.value
  const list = dayEvents.value.filter(e =>
    matchesAge(e, age.value)
    && (!time.value || timeOfDay(e.start) === time.value)
    && (!codes || (!!e.branch && codes.has(e.branch.BranchCode)))
  )
  return sortEvents(list, lat.value, lng.value, sort.value)
})

function openBranch(b: Branch) {
  emit('open-branch', b)
}

// ── Formatting ────────────────────────────────────────────────────────
// "Monday, November 23rd, 2026"
function longDate(d: string) {
  const date = new Date(d + 'T00:00:00')
  const n = date.getDate()
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'
  const weekday = date.toLocaleDateString('en-CA', { weekday: 'long' })
  const month = date.toLocaleDateString('en-CA', { month: 'long' })
  return `${weekday}, ${month} ${n}${suffix}, ${date.getFullYear()}`
}

function dayLabel(d: string) {
  if (d === today.value) return 'today'
  if (d === addDays(today.value, 1)) return 'tomorrow'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long' })
}





onMounted(async () => {
  startClock()
  access.value = await locationAccess()
})
onActivated(startClock)
onDeactivated(stopClock)
onBeforeUnmount(stopClock)
</script>

<style scoped>
.geo-state {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 14px 0;
}

.geo-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--tpl-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Controls: day picker and filter, centred as one group ───────── */
.events-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: -8px 0 4px;
}

/* One height for the day box and the filter button */
.day-picker {
  display: flex;
  align-items: stretch;
  height: 36px;
  box-sizing: border-box;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.day-step {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text);
  cursor: pointer;

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
}

.day-step-icon {
  width: 14px;
  height: 14px;
  stroke: currentColor;
}

.day-step-prev {
  transform: rotate(180deg);
}

.day-current {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 10px;
  border-inline: 1px solid var(--color-border);
  font-size: 0.875rem;
  color: var(--color-text);
  white-space: nowrap;

  &:has(:focus-visible) {
    outline: 2px solid var(--tpl-blue);
    outline-offset: -2px;
  }
}

.day-labels {
  display: grid;
  justify-items: center;

  > span {
    grid-area: 1 / 1;
    visibility: hidden;
  }

  > .on {
    visibility: visible;
  }
}

/* The phone's own picker over the label */
.overlay-select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
  font-size: 16px;
}

.filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  box-sizing: border-box;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;

  &.active {
    background: var(--tpl-navy);
    border-color: var(--tpl-navy);
    color: #fff;
  }
}

.filter-icon {
  width: 18px;
  height: 18px;
}

.events-note {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 8px 0;
  margin: 0;
}

.text-btn {
  margin-left: 4px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-weight: 600;
  color: var(--color-brand-text);
  text-decoration: underline;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

/* ── Rows ────────────────────────────────────────────────────────── */
.event-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
}

.event-row.clickable {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: var(--color-paper);
  }
}

.event-date {
  flex-shrink: 0;
  width: 46px;
  background: color-mix(in srgb, var(--tpl-blue) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--tpl-blue) 25%, transparent);
  border-radius: var(--radius-sm, 6px);
  padding: 6px 4px 7px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.event-month {
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--tpl-blue);
}

.event-day {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--color-brand-text);
}

.event-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.event-title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

/* The event's TPL page: a small mark at the end of the title */
.event-link {
  display: inline-flex;
  vertical-align: -1px;
  margin-left: 5px;
  padding: 2px;
  color: var(--color-text-muted);
}

.event-link-icon {
  width: 12px;
  height: 12px;
}

.event-meta {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-stamp {
  margin-right: 5px;
  vertical-align: -1px;
}

.event-chevron {
  width: 14px;
  height: 14px;
  stroke: var(--color-text-muted);
  flex-shrink: 0;
}

.events-load-more {
  margin-top: 6px;
  width: 100%;
  padding: 12px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-mid);
  cursor: pointer;
}

/* ── Filter sheet ────────────────────────────────────────────────── */
.filter-sheet {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 20px 24px;
}

.filter-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--color-brand-text);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text-mid);
  }

  select {
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: 16px;
  }
}

.filter-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.done-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: var(--radius);
  background: var(--tpl-navy);
  color: #fff;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
