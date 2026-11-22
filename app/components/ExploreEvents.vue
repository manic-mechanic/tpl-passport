<template>
  <div v-if="eventsLoading && sortedEvents.length === 0" class="geo-state">
    <span class="geo-spinner" />
    <span>Loading events…</span>
  </div>
  <p v-else-if="eventsError" class="geo-denied">Could not load events.</p>
  <div v-else class="events-list">
    <div class="events-controls">
      <button class="events-filter-btn" :class="{ active: !isManualDaySelection }" @click="resetToToday">
        Today
      </button>
      <input
        v-model="selectedEventsDate"
        class="events-date-input"
        type="date"
        :min="availableEventDays[0] ?? selectedEventsDate"
        :max="availableEventDays[availableEventDays.length - 1] ?? selectedEventsDate"
        @change="onEventsDateChange"
      >
    </div>
    <p v-if="eventsInView.length === 0" class="geo-denied">No events for the selected day.</p>
    <div
      v-for="event in eventsInView"
      :key="event.id"
      class="event-row"
      :class="{ 'event-row-clickable': event.branch }"
      :role="event.branch ? 'button' : undefined"
      :tabindex="event.branch ? 0 : undefined"
      @click="event.branch && $emit('open-branch', event.branch)"
      @keydown.enter="event.branch && $emit('open-branch', event.branch)"
    >
      <div class="event-date">
        <span class="event-month">{{ formatEventDateParts(event.date).month }}</span>
        <span class="event-day">{{ formatEventDateParts(event.date).day }}</span>
        <span class="event-weekday">{{ formatEventDateParts(event.date).weekday }}</span>
      </div>
      <div class="event-info">
        <p class="event-title">{{ event.title }}</p>
        <p class="event-meta">{{ [event.locationName, formatEventTime(event.time), formatAudiences(event.audiences)].filter(Boolean).join(' · ') }}</p>
      </div>
      <IconChevron v-if="event.branch" class="event-chevron" />
    </div>
    <button v-if="canLoadMoreDays" class="events-load-more" @click="loadMoreDays">
      Load more days
    </button>
  </div>
</template>

<script setup lang="ts">
import { eventLocationKey, type Branch } from '@tpl-passport/shared'
import { physicalBranches, haversineKm } from '~/composables/useRegion'
import { formatAudiences, formatEventTime } from '~/composables/useEvents'
import { localDayKey } from '@tpl-passport/shared'
import { reportError } from '~/lib/reportError'
import IconChevron from '~/components/icons/IconChevron.vue'

// What's On tab: upcoming events across all branches, loaded a day at a time.
// When the user's location is known, events on the same day are sorted by distance.
const props = withDefaults(defineProps<{
  userLat?: number | null
  userLng?: number | null
}>(), {
  userLat: null,
  userLng: null,
})
defineEmits<{ 'open-branch': [branch: Branch] }>()

// One record from /api/all-events. Field names vary between feed versions.
interface RawEvent {
  _id: string | number
  LocationName?: string
  Location?: string
  EventName?: string
  'Event Name'?: string
  Title?: string
  StartDateLocal: string
  StartTime?: string
  Audiences?: string
  AgeGroup?: string
  'Age Group'?: string
}

interface ExploreEvent {
  id: string | number
  title: string
  date: string
  time: string
  audiences: string
  locationName: string
  branch: Branch | null
}

// ── Events (What's On) ───────────────────────────────────────────────
const branchByShortName = new Map(
  physicalBranches.map(b => [eventLocationKey(b.BranchName), b])
)

function formatEventDateParts(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('en-CA', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-CA', { weekday: 'short' }),
  }
}

const eventsData = ref<ExploreEvent[]>([])
const eventsLoading = ref(false)
const eventsError = ref<unknown>(null)
const loadedEventOffsets = ref<number[]>([])
const MAX_EVENT_DAYS = 7

function eventFromRaw(raw: RawEvent): ExploreEvent {
    const locationName = raw.LocationName ?? raw.Location ?? ''
    return {
      id: raw._id,
      title: raw.EventName ?? raw['Event Name'] ?? raw.Title ?? 'Event',
      date: raw.StartDateLocal,
      time: raw.StartTime ?? '',
      audiences: raw.Audiences ?? raw.AgeGroup ?? raw['Age Group'] ?? '',
      locationName,
      branch: branchByShortName.get(eventLocationKey(locationName)) ?? null,
    }
}

async function fetchEventsWindow(offset: number, days: number) {
  eventsLoading.value = true
  eventsError.value = null
  try {
    const records: unknown = await $fetch('/api/all-events', { query: { offset, days } })
    const mapped = (Array.isArray(records) ? records as RawEvent[] : []).map(eventFromRaw)
    const next = new Map(eventsData.value.map(event => [event.id, event]))
    for (const event of mapped) next.set(event.id, event)
    eventsData.value = [...next.values()]
    loadedEventOffsets.value = [...new Set([
      ...loadedEventOffsets.value,
      ...Array.from({ length: days }, (_, i) => offset + i).filter(i => i >= 0 && i < MAX_EVENT_DAYS),
    ])]
  } catch (error) {
    eventsError.value = error
    reportError(error, {
      area: 'events',
      operation: 'all_events_window_fetch',
      offset,
      days,
    })
  } finally {
    eventsLoading.value = false
  }
}

const sortedEvents = computed(() => {
  const evs = eventsData.value
  const { userLat, userLng } = props
  if (!userLat || !userLng) return evs
  return [...evs].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    const aDist = a.branch ? haversineKm(userLat, userLng, a.branch.Lat, a.branch.Long) : 999
    const bDist = b.branch ? haversineKm(userLat, userLng, b.branch.Lat, b.branch.Long) : 999
    if (Math.abs(aDist - bDist) > 2) return aDist - bDist
    return (a.time ?? '') < (b.time ?? '') ? -1 : 1
  })
})

const selectedEventsDate = ref(localDayKey(new Date()) ?? '')
const isManualDaySelection = ref(false)
const visibleEventDayCount = ref(1)
const todayDay = computed(() => localDayKey(new Date()) ?? '')

function dayAtOffset(offset: number) {
  const day = new Date()
  day.setDate(day.getDate() + offset)
  return localDayKey(day)
}

function offsetForDay(dayKey: string) {
  if (!dayKey || !todayDay.value) return null
  const base = new Date(`${todayDay.value}T00:00:00`)
  const target = new Date(`${dayKey}T00:00:00`)
  return Math.round((target.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))
}

const availableEventDays = computed(() =>
  Array.from({ length: MAX_EVENT_DAYS }, (_, i) => dayAtOffset(i)).filter((d): d is string => !!d)
)

const visibleEventDays = computed(() =>
  availableEventDays.value.slice(0, visibleEventDayCount.value)
)

const eventsInView = computed(() => {
  if (isManualDaySelection.value && selectedEventsDate.value) {
    return sortedEvents.value.filter(event => event.date === selectedEventsDate.value)
  }
  return sortedEvents.value.filter(event => visibleEventDays.value.includes(event.date))
})

const canLoadMoreDays = computed(() =>
  !isManualDaySelection.value && visibleEventDayCount.value < MAX_EVENT_DAYS
)

async function ensureOffsetLoaded(offset: number) {
  if (offset < 0 || offset >= MAX_EVENT_DAYS) return
  if (loadedEventOffsets.value.includes(offset)) return
  await fetchEventsWindow(offset, 1)
}

async function resetToToday() {
  selectedEventsDate.value = todayDay.value
  isManualDaySelection.value = false
  visibleEventDayCount.value = 1
  await ensureOffsetLoaded(0)
}

async function loadMoreDays() {
  const nextOffset = visibleEventDayCount.value
  visibleEventDayCount.value += 1
  await ensureOffsetLoaded(nextOffset)
}

async function onEventsDateChange() {
  isManualDaySelection.value = true
  const offset = offsetForDay(selectedEventsDate.value)
  if (offset === null) return
  await ensureOffsetLoaded(offset)
}

onMounted(() => {
  ensureOffsetLoaded(0)
})

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

.geo-denied {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 8px 0;
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
