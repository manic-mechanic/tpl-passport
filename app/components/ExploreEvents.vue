<template>
  <div class="events-list">
    <div class="events-controls">
      <button class="events-filter-btn" :class="{ active: !pickedDay }" @click="resetToToday">
        Upcoming
      </button>
      <input
        :value="pickedDay ?? ''"
        class="events-date-input"
        :class="{ active: !!pickedDay }"
        type="date"
        aria-label="Pick a day"
        :min="days[0]"
        :max="days[days.length - 1]"
        @change="onPickDay(($event.target as HTMLInputElement).value)"
      >
    </div>

    <p v-if="pickedDay && !days.includes(pickedDay)" class="events-note">
      Events are listed for the next {{ MAX_DAYS }} days only.
    </p>
    <template v-else>
      <template v-for="day in shownDays" :key="day">
        <p v-if="day === today && !pickedDay && todayFinished" class="events-note">
          Nothing else on today. Here's what's next.
        </p>
        <div
          v-for="event in eventsOn(day)"
          :key="event.id"
          class="event-row"
          :class="{ 'event-row-clickable': event.branch }"
          :role="event.branch ? 'button' : undefined"
          :tabindex="event.branch ? 0 : undefined"
          @click="event.branch && $emit('open-branch', event.branch)"
          @keydown.enter="event.branch && $emit('open-branch', event.branch)"
        >
          <div class="event-date">
            <span class="event-month">{{ dateParts(event.date).month }}</span>
            <span class="event-day">{{ dateParts(event.date).day }}</span>
            <span class="event-weekday">{{ dateParts(event.date).weekday }}</span>
          </div>
          <div class="event-info">
            <p class="event-title">{{ event.title }}</p>
            <p class="event-meta">{{ metaLine(event) }}</p>
          </div>
          <IconChevron v-if="event.branch" class="event-chevron" />
        </div>
        <div v-if="dayState(day) === 'loading'" class="geo-state">
          <span class="geo-spinner" />
          <span>Loading {{ dayLabel(day) }}…</span>
        </div>
        <p v-else-if="dayState(day) === 'error'" class="events-note">
          Couldn't load events for {{ dayLabel(day) }}.
          <button class="events-retry" @click="loadDay(day)">Try again</button>
        </p>
        <p v-else-if="pickedDay && eventsOn(day).length === 0" class="events-note">
          {{ day === today ? 'Nothing else on today.' : `No events on ${dayLabel(day)}.` }}
        </p>
      </template>
    </template>

    <button v-if="canLoadMore" class="events-load-more" @click="dayCount += 1">
      Load {{ dayLabel(days[shownDays.length]!) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { physicalBranches } from '~/composables/useRegion'
import { formatAudiences, formatEventTime } from '~/composables/useEvents'
import { reportError } from '~/lib/reportError'
import {
  addDays, branchLookup, distanceKm, formatKm, isOver, sortEvents, toExploreEvents,
  torontoNow, torontoToday, type ExploreEvent, type RawEvent,
} from '~/lib/exploreEvents'
import IconChevron from '~/components/icons/IconChevron.vue'

// What's On tab: upcoming events across all branches, loaded a day at a time
// (by Toronto date, like /api/all-events). Today's finished events are left
// out. With the user's location, each day's events go nearest first.
const props = withDefaults(defineProps<{
  userLat?: number | null
  userLng?: number | null
}>(), {
  userLat: null,
  userLng: null,
})
defineEmits<{ 'open-branch': [branch: Branch] }>()

const MAX_DAYS = 7
const branches = branchLookup(physicalBranches)

// ── Clock ─────────────────────────────────────────────────────────────
// The tab is kept alive, so "now" ticks and the list resets at midnight.
const now = ref(torontoNow())
const today = computed(() => now.value.slice(0, 10))
const days = computed(() => Array.from({ length: MAX_DAYS }, (_, i) => addDays(today.value, i)))

function tick() {
  now.value = torontoNow()
}
let timer: ReturnType<typeof setInterval> | undefined
function startClock() {
  tick()
  clearInterval(timer)
  timer = setInterval(tick, 60_000)
}
function stopClock() {
  clearInterval(timer)
  timer = undefined
}

// ── Loading, a day at a time ──────────────────────────────────────────
const eventsByDay = ref<Record<string, ExploreEvent[]>>({})
const stateByDay = ref<Record<string, 'loading' | 'error' | 'done'>>({})

function dayState(day: string) {
  return stateByDay.value[day]
}

async function loadDay(day: string) {
  const offset = days.value.indexOf(day)
  if (offset < 0 || stateByDay.value[day] === 'loading') return
  stateByDay.value[day] = 'loading'
  try {
    const records: unknown = await $fetch('/api/all-events', { query: { offset, days: 1 } })
    const raw = (Array.isArray(records) ? records : []) as RawEvent[]
    // The server's "today" is Toronto's too; keep only the day asked for.
    eventsByDay.value[day] = toExploreEvents(raw.filter(r => r.StartDateLocal === day), branches)
    stateByDay.value[day] = 'done'
  } catch (error) {
    stateByDay.value[day] = 'error'
    reportError(error, { area: 'events', operation: 'all_events_window_fetch', offset, days: 1 })
  }
}

function ensureLoaded(day: string) {
  if (!stateByDay.value[day]) loadDay(day)
}

// ── What's shown ──────────────────────────────────────────────────────
const pickedDay = ref<string | null>(null)
const dayCount = ref(1)

function eventsOn(day: string): ExploreEvent[] {
  const list = (eventsByDay.value[day] ?? []).filter(e => day !== today.value || !isOver(e, now.value))
  return sortEvents(list, props.userLat, props.userLng)
}

// Once today's events are all over, tomorrow's come along with it.
const todayFinished = computed(() =>
  stateByDay.value[today.value] === 'done' && eventsOn(today.value).length === 0
)

const shownDays = computed(() => {
  if (pickedDay.value) return days.value.includes(pickedDay.value) ? [pickedDay.value] : []
  const count = Math.min(MAX_DAYS, dayCount.value + (todayFinished.value ? 1 : 0))
  return days.value.slice(0, count)
})

const canLoadMore = computed(() =>
  !pickedDay.value && shownDays.value.length < MAX_DAYS
  && shownDays.value.every(d => stateByDay.value[d] === 'done')
)

watch(shownDays, list => list.forEach(ensureLoaded), { immediate: true })

// A new day: drop what was loaded for the old relative days.
watch(today, () => {
  eventsByDay.value = {}
  stateByDay.value = {}
  dayCount.value = 1
  if (pickedDay.value && !days.value.includes(pickedDay.value)) pickedDay.value = null
  shownDays.value.forEach(ensureLoaded)
})

function resetToToday() {
  pickedDay.value = null
  dayCount.value = 1
}

function onPickDay(value: string) {
  if (!value) resetToToday()
  else pickedDay.value = value
}

// ── Formatting ────────────────────────────────────────────────────────
function dateParts(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('en-CA', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-CA', { weekday: 'short' }),
  }
}

function dayLabel(day: string) {
  if (day === today.value) return 'today'
  if (day === addDays(today.value, 1)) return 'tomorrow'
  return new Date(day + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })
}

function metaLine(event: ExploreEvent) {
  const km = distanceKm(event, props.userLat, props.userLng)
  return [
    event.locationName,
    formatEventTime(event.start),
    formatAudiences(event.audiences),
    km == null ? '' : formatKm(km),
  ].filter(Boolean).join(' · ')
}

onMounted(startClock)
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

/* ── What's On ───────────────────────────────────────────────────── */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.events-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.events-filter-btn {
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;

  &.active {
    background: var(--tpl-navy);
    border-color: var(--tpl-navy);
    color: #fff;
  }
}

.events-date-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-surface);

  &.active {
    border-color: var(--tpl-navy);
    box-shadow: inset 0 0 0 1px var(--tpl-navy);
  }
}

.events-note {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 8px 0;
  margin: 0;
}

.events-retry {
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

.event-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
}

.event-row-clickable {
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
  padding: 6px 4px;
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
  text-transform: uppercase;
}

.event-day {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--color-brand-text);
}


.event-weekday {
  font-size: 0.5625rem;
  font-weight: 600;
  color: var(--color-text-muted);
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
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
}
</style>
