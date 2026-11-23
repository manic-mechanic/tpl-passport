<template>
  <div class="events-list">
    <div class="events-toolbar">
      <!-- Day: step through the loaded week, or pick from the list -->
      <div class="day-picker">
        <button class="day-step" :disabled="dayIndex <= 0" aria-label="Previous day" @click="stepDay(-1)">
          <IconChevron class="day-step-icon day-step-prev" />
        </button>
        <label class="day-current">
          <span class="day-rel">{{ dayRelative(day) }}</span>
          <span class="day-date">{{ dayDate(day) }}</span>
          <select class="overlay-select" aria-label="Choose a day" :value="day" @change="pickDay(($event.target as HTMLSelectElement).value)">
            <option v-for="d in days" :key="d" :value="d">{{ dayOptionLabel(d) }}</option>
          </select>
        </label>
        <button class="day-step" :disabled="dayIndex >= days.length - 1" aria-label="Next day" @click="stepDay(1)">
          <IconChevron class="day-step-icon" />
        </button>
      </div>
      <button class="filter-btn" :class="{ active: activeFilterCount > 0 }" @click="filtersOpen = true">
        Filter<template v-if="activeFilterCount"> ({{ activeFilterCount }})</template>
      </button>
    </div>
    <p v-if="locateError" class="events-note">{{ locateError }}</p>

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
      <section v-for="group in groups" :key="group.time" class="programme-group">
        <h3 v-if="group.time" class="programme-time">{{ group.time }}</h3>
        <ul class="programme">
          <li v-for="event in group.events" :key="event.id" class="event-row" :class="{ clickable: event.branch }"
              :role="event.branch ? 'button' : undefined" :tabindex="event.branch ? 0 : undefined"
              :aria-label="event.branch ? `${event.title}, ${event.locationName}. Open branch` : undefined"
              @click="event.branch && openBranch(event.branch)"
              @keydown.enter.self="event.branch && openBranch(event.branch)"
          >
            <div class="cal" aria-hidden="true">
              <span class="cal-month">{{ dateParts(event.date).month }}</span>
              <span class="cal-day">{{ dateParts(event.date).day }}</span>
              <span class="cal-weekday">{{ dateParts(event.date).weekday }}</span>
            </div>
            <div class="event-info">
              <p class="event-title">{{ event.title }}</p>
              <p class="event-meta">
                <span class="event-meta-text">
                  <span v-if="!group.time" class="event-time">{{ formatEventTime(event.start) }}</span>
                  <span class="event-branch">
                    <IconCheckMark v-if="event.branch && passport.hasVisited(event.branch.BranchCode)" class="event-visited" role="img" aria-label="Visited" />{{ event.branch ? shortName(event.branch) : event.locationName }}</span>
                  <span v-if="event.audiences" class="event-ages">{{ formatAudiences(event.audiences) }}</span>
                </span>
                <a v-if="event.url" :href="event.url" target="_blank" rel="noopener" class="event-link"
                   :aria-label="`${event.title} on the TPL website (opens another site)`"
                   @click.stop="$posthog?.capture('whats_on_event_link_tapped', { title: event.title })"
                   @keydown.enter.stop
                ><IconExternal class="event-link-icon" aria-hidden="true" /></a>
              </p>
            </div>
            <IconChevron v-if="event.branch" class="event-chevron" aria-hidden="true" />
          </li>
        </ul>
      </section>

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
import IconCheckMark from '~/components/icons/IconCheckMark.vue'
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
const unwatchSkip = watch(() => stateByDay.value[today.value], (s) => {
  if (s !== 'done' && s !== 'error') return
  if (s === 'done' && day.value === today.value && dayEvents.value.length === 0) {
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
    month: d.toLocaleDateString('en-CA', { month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('en-CA', { weekday: 'short' }),
  }
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
  if (d === today.value) return `Today, ${date}`
  if (d === addDays(today.value, 1)) return `Tomorrow, ${date}`
  return date
}

// By time, events sit under their start time; nearest first, in one list
// with the time on each row.
const groups = computed(() => {
  if (sort.value === 'nearest') return [{ time: '', events: shown.value }]
  const out: { time: string, events: ExploreEvent[] }[] = []
  for (const e of shown.value) {
    const time = formatEventTime(e.start) || 'Time to be announced'
    const last = out[out.length - 1]
    if (last?.time === time) last.events.push(e)
    else out.push({ time, events: [e] })
  }
  return out
})

function dayRelative(d: string) {
  if (d === today.value) return 'Today'
  if (d === addDays(today.value, 1)) return 'Tomorrow'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long' })
}

function dayDate(d: string) {
  const opts: Intl.DateTimeFormatOptions = d === today.value || d === addDays(today.value, 1)
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric' }
  return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', opts)
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
  gap: 10px;
}

/* ── Toolbar: day picker and Filter ──────────────────────────────── */
.events-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: -8px;
}

/* The arrows are joined to the day */
.day-picker {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  overflow: hidden;
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
  align-items: baseline;
  gap: 6px;
  padding: 6px 10px;
  border-inline: 1px solid var(--color-border);
  font-size: 0.875rem;
  color: var(--color-text);
  white-space: nowrap;
}

.day-rel {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-brand-text);
}

.day-date {
  color: var(--color-text-mid);
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

.filter-btn {
  padding: 6px 2px;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-mid);
  cursor: pointer;

  &.active {
    color: var(--color-brand-text);
  }
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

/* ── Programme: events under their start time ─────────────────────── */
.programme-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.programme-time {
  margin: 8px 0 0;
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 600;
  font-variant-numeric: lining-nums;
  color: var(--color-brand-text);
}

/* One sheet per time slot, rows ruled off, like a printed listing */
.programme {
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-sm);
}

.event-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 10px 12px;

  & + & {
    border-top: 1px solid var(--color-border-soft);
  }
}

.event-row.clickable {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: var(--color-paper);
  }

  &:focus-visible {
    outline: 2px solid var(--tpl-blue);
    outline-offset: -2px;
  }
}

/* A tear-off desk calendar page */
.cal {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 40px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--tpl-navy) 30%, var(--color-border));
  border-radius: 6px;
  background: var(--color-surface);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--tpl-navy) 15%, transparent);
}

.cal-month {
  align-self: stretch;
  padding: 1px 0 2px;
  background: var(--tpl-navy);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
}

.cal-day {
  margin-top: 2px;
  font-family: var(--font-display);
  font-size: 1.1875rem;
  font-weight: 600;
  line-height: 1;
  color: var(--color-brand-text);
}

.cal-weekday {
  padding-bottom: 3px;
  font-size: 0.5625rem;
  color: var(--color-text-muted);
}

.event-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 0.8125rem;
}

/* One line, cut short if it doesn't fit: (time) branch, then ages */
.event-meta-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-time {
  margin-right: 8px;
  font-weight: 600;
  color: var(--color-text);
}

.event-branch {
  color: var(--color-text-mid);
}

/* Checked in here before */
.event-visited {
  display: inline-block;
  width: 13px;
  height: 13px;
  margin-right: 3px;
  vertical-align: -2px;
  color: var(--color-success);
}

.event-ages {
  margin-left: 8px;
  color: var(--color-text-muted);
}

/* The event's TPL page, with a bigger tap area than it shows */
.event-link {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: -6px -4px -6px 0;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);

  &:active {
    background: var(--color-paper);
  }
}

.event-link-icon {
  width: 14px;
  height: 14px;
}

.event-chevron {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  stroke: var(--color-text-muted);
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
