<template>
  <div class="events-list">
    <!-- Day: step through the loaded week, or pick from the list -->
    <div class="day-picker">
      <button class="day-step" :disabled="dayIndex <= 0" aria-label="Previous day" @click="stepDay(-1)">
        <IconChevron class="day-step-icon day-step-prev" />
      </button>
      <label class="day-current">
        <span>{{ dayOptionLabel(day) }}</span>
        <IconChevron class="pill-chevron" aria-hidden="true" />
        <select class="overlay-select" aria-label="Choose a day" :value="day" @change="pickDay(($event.target as HTMLSelectElement).value)">
          <option v-for="d in days" :key="d" :value="d">{{ dayOptionLabel(d) }}</option>
        </select>
      </label>
      <button class="day-step" :disabled="dayIndex >= days.length - 1" aria-label="Next day" @click="stepDay(1)">
        <IconChevron class="day-step-icon" />
      </button>
    </div>

    <!-- Filters and sort -->
    <div class="filter-bar">
      <label class="pill" :class="{ active: age }">
        <span>{{ age ? AGE_GROUPS.find(g => g.id === age)?.label : 'All ages' }}</span>
        <IconChevron class="pill-chevron" aria-hidden="true" />
        <select class="overlay-select" aria-label="Ages" :value="age ?? ''" @change="setFilter('age', ($event.target as HTMLSelectElement).value)">
          <option value="">All ages</option>
          <option v-for="g in AGE_GROUPS" :key="g.id" :value="g.id">{{ g.label }}</option>
        </select>
      </label>
      <label class="pill" :class="{ active: time }">
        <TimeOfDayIcon v-if="time" :time="time" class="pill-icon" />
        <span>{{ time ? TIMES_OF_DAY.find(t => t.id === time)?.label : 'Any time' }}</span>
        <IconChevron class="pill-chevron" aria-hidden="true" />
        <select class="overlay-select" aria-label="Time of day" :value="time ?? ''" @change="setFilter('time', ($event.target as HTMLSelectElement).value)">
          <option value="">Any time</option>
          <option v-for="t in TIMES_OF_DAY" :key="t.id" :value="t.id">{{ t.label }} ({{ t.hint }})</option>
        </select>
      </label>
      <label class="pill" :class="{ active: place }">
        <span>{{ placeLabel }}</span>
        <IconChevron class="pill-chevron" aria-hidden="true" />
        <select class="overlay-select" aria-label="Branches" :value="place" @change="setFilter('place', ($event.target as HTMLSelectElement).value)">
          <option value="">All branches</option>
          <option v-if="homeBranch" value="home">Home branch ({{ shortName(homeBranch) }})</option>
          <option v-if="access !== 'denied'" value="near">Near me ({{ NEAR_COUNT }} closest)</option>
          <optgroup v-for="group in placeGroups" :key="group.label" :label="group.label">
            <option v-for="o in group.options" :key="o.id" :value="o.id">{{ o.label }}</option>
          </optgroup>
        </select>
      </label>
      <button class="pill" :class="{ active: sort === 'nearest' }" :aria-pressed="sort === 'nearest'"
              :disabled="access === 'denied'" @click="toggleNearest"
      >
        <IconMapPin class="pill-icon" aria-hidden="true" />
        <span>{{ locating ? 'Locating…' : 'Nearest first' }}</span>
      </button>
    </div>
    <p v-if="locateError" class="events-note">{{ locateError }}</p>
    <p v-if="skippedToday && day === days[1]" class="events-note">Nothing else on today, so here's tomorrow.</p>

    <!-- Events for the day -->
    <div v-if="state === 'loading' || !state" class="geo-state">
      <span class="geo-spinner" />
      <span>Loading events…</span>
    </div>
    <p v-else-if="state === 'error'" class="events-note">
      Couldn't load events for {{ dayLabel(day) }}.
      <button class="text-btn" @click="loadDay(day)">Try again</button>
    </p>
    <template v-else>
      <div v-for="event in shown" :key="event.id" class="event-row" :class="[`tone-${ageTone(event.audiences)}`, { clickable: event.branch }]"
           :role="event.branch ? 'button' : undefined" :tabindex="event.branch ? 0 : undefined"
           :aria-label="event.branch ? `${event.title}, ${event.locationName}. Open branch` : undefined"
           @click="event.branch && openBranch(event.branch)"
           @keydown.enter.self="event.branch && openBranch(event.branch)"
      >
        <div class="event-stamp">
          <StampShape v-if="event.branch" :branch-code="event.branch.BranchCode" :ward-no="event.branch.WardNo" :size="40" />
          <span v-else class="event-stamp-blank" aria-hidden="true">
            <IconOnline v-if="event.locationName === 'Online'" />
          </span>
          <span class="event-stamp-label">{{ event.branch ? stampLabel(event.branch) : event.locationName }}</span>
        </div>
        <div class="event-info">
          <p class="event-title">{{ event.title }}</p>
          <p class="event-meta">
            <span v-if="timeOfDay(event.start)" class="event-time">
              <TimeOfDayIcon :time="timeOfDay(event.start)!" class="event-time-icon" />{{ timeRange(event) }}
            </span>
            <span v-for="part in metaParts(event)" :key="part" class="event-meta-part">{{ part }}</span>
          </p>
        </div>
        <a v-if="event.url" :href="event.url" target="_blank" rel="noopener" class="event-link"
           :aria-label="`${event.title} on the TPL website (opens another site)`"
           @click.stop="$posthog?.capture('whats_on_event_link_tapped', { title: event.title })"
           @keydown.enter.stop
        >
          <IconExternal class="event-link-icon" />
        </a>
      </div>

      <template v-if="shown.length === 0">
        <p v-if="dayEvents.length > 0" class="events-note">
          No events match these filters.
          <button class="text-btn" @click="clearFilters">Clear filters</button>
        </p>
        <p v-else class="events-note">
          {{ day === today ? 'Nothing else on today.' : `No events on ${dayLabel(day)}.` }}
        </p>
        <button v-if="dayIndex < days.length - 1" class="events-load-more" @click="stepDay(1)">
          See {{ dayLabel(days[dayIndex + 1]!) }}
        </button>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { formatDist, haversineKm } from '@tpl-passport/shared'
import { physicalBranches, branchesByCode } from '~/composables/useRegion'
import { formatAudiences, formatEventTime } from '~/composables/useEvents'
import { reportError } from '~/lib/reportError'
import { getPosition, locationAccess, type LocationAccess } from '~/lib/geolocation'
import { tourRoutes } from '~/lib/libraryTour'
import { stampLabel } from '~/lib/stampLabel'
import { usePassportStore } from '~/stores/passport'
import routesData from '#data/routes.json'
import {
  AGE_GROUPS, TIMES_OF_DAY, addDays, ageTone, branchLookup, distanceKm, isOver, matchesAge, sortEvents,
  timeOfDay, toExploreEvents, torontoNow,
  type AgeGroupId, type EventSort, type ExploreEvent, type RawEvent, type TimeOfDay,
} from '~/lib/exploreEvents'
import IconChevron from '~/components/icons/IconChevron.vue'
import IconExternal from '~/components/icons/IconExternal.vue'
import IconMapPin from '~/components/icons/IconMapPin.vue'
import IconOnline from '~/components/icons/IconOnline.vue'
import TimeOfDayIcon from '~/components/icons/TimeOfDayIcon.vue'

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
const day = ref(today.value)
const dayIndex = computed(() => days.value.indexOf(day.value))
const state = computed(() => stateByDay.value[day.value])

// Load the day shown and the next one, so stepping forward is instant.
watch(day, (d) => {
  ensureLoaded(d)
  ensureLoaded(days.value[days.value.indexOf(d) + 1])
}, { immediate: true })

// A new day: drop what was loaded and move off a day that's gone.
watch(today, (t) => {
  eventsByDay.value = {}
  stateByDay.value = {}
  if (day.value < t) day.value = t
  ensureLoaded(day.value)
})

// Opening in the evening with today all over: start on tomorrow instead.
const skippedToday = ref(false)
const unwatchSkip = watch(() => stateByDay.value[today.value], (s) => {
  if (s !== 'done' && s !== 'error') return
  if (s === 'done' && day.value === today.value && dayEvents.value.length === 0) {
    skippedToday.value = true
    day.value = days.value[1]!
  }
  unwatchSkip()
})

function pickDay(d: string) {
  if (days.value.includes(d)) day.value = d
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
const filtersOn = computed(() => !!(age.value || time.value || place.value))

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

const placeLabel = computed(() => {
  if (!place.value) return 'All branches'
  if (place.value === 'home') return 'Home branch'
  if (place.value === 'near') return 'Near me'
  const option = placeGroups.value.flatMap(g => g.options).find(o => o.id === place.value)
  return option?.label.replace(/^Walk: /, '').replace(/^(Tour \d+):.*/, '$1') ?? 'Branches'
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

async function toggleNearest() {
  if (sort.value === 'nearest') sort.value = 'time'
  else if (await locate()) sort.value = 'nearest'
  $posthog?.capture('whats_on_sort_changed', { sort: sort.value })
}

// ── What's shown ──────────────────────────────────────────────────────
// The day's events still to come (all of them, on later days).
const dayEvents = computed(() =>
  (eventsByDay.value[day.value] ?? []).filter(e => day.value !== today.value || !isOver(e, now.value))
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
function dayLabel(d: string) {
  if (d === today.value) return 'today'
  if (d === addDays(today.value, 1)) return 'tomorrow'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long' })
}

function dayOptionLabel(d: string) {
  const date = new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
  if (d === today.value) return `Today · ${date}`
  if (d === addDays(today.value, 1)) return `Tomorrow · ${date}`
  return date
}

// "10:00–11:30am", or "11:30am–1:00pm" across noon.
function timeRange(e: ExploreEvent) {
  const start = formatEventTime(e.start)
  const end = formatEventTime(e.end)
  if (!end) return start
  return start.slice(-2) === end.slice(-2) ? `${start.slice(0, -2)}–${end}` : `${start}–${end}`
}

function metaParts(e: ExploreEvent) {
  const km = distanceKm(e, lat.value, lng.value)
  return [formatAudiences(e.audiences), km == null ? '' : formatDist(km)].filter(Boolean)
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

/* ── Day picker ──────────────────────────────────────────────────── */
.day-picker {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.day-step {
  flex: 0 0 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
}

.day-step-icon {
  width: 16px;
  height: 16px;
  stroke: currentColor;
}

.day-step-prev {
  transform: rotate(180deg);
}

.day-current {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
}

/* A native select over the label: the phone's own picker, our looks. */
.overlay-select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
  font-size: 16px;
}

/* ── Filters ─────────────────────────────────────────────────────── */
.filter-bar {
  display: flex;
  gap: 6px;
  margin: 0 -18px 4px;
  padding: 0 18px 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-bar::-webkit-scrollbar {
  display: none;
}

.pill {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-mid);
  white-space: nowrap;
  cursor: pointer;

  &.active {
    background: var(--tpl-navy);
    border-color: var(--tpl-navy);
    color: #fff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }

  &:focus-visible,
  &:has(:focus-visible) {
    outline: 2px solid var(--tpl-blue);
    outline-offset: 1px;
  }
}

.pill-chevron {
  width: 10px;
  height: 10px;
  stroke: currentColor;
  transform: rotate(90deg);
}

.pill-icon {
  width: 14px;
  height: 14px;
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
}

/* ── Rows ────────────────────────────────────────────────────────── */
.event-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 6px 10px 10px;
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--tone, var(--color-border-soft)) 40%, var(--color-border-soft));
  border-radius: var(--radius);
}

/* Who it's for, broadly: a tint in the border */
.tone-kids { --tone: #e5a23a; }
.tone-teens { --tone: #9a6ad0; }
.tone-adults { --tone: var(--tpl-teal); }
.tone-family { --tone: var(--tpl-blue); }

.event-row.clickable {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: var(--color-paper);
  }
}

.event-stamp {
  flex: 0 0 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.event-stamp-blank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1.5px dashed var(--color-border);
  border-radius: 50%;
  color: var(--color-text-muted);

  svg {
    width: 20px;
    height: 20px;
  }
}

.event-stamp-label {
  max-width: 100%;
  font-size: 0.625rem;
  line-height: 1.3;
  color: var(--color-text-muted);
  text-align: center;
  overflow-wrap: anywhere;
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

.event-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0;
}

.event-time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.event-time,
.event-meta-part {
  white-space: nowrap;
}

.event-meta-part::before {
  content: '·';
  margin-right: 6px;
}

.event-meta-part:first-child::before {
  content: none;
}

.event-time-icon {
  width: 13px;
  height: 13px;
}

.event-link {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);

  &:active {
    background: var(--color-paper);
  }
}

.event-link-icon {
  width: 16px;
  height: 16px;
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
</style>
