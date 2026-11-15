<template>
  <div v-if="branch">
    <div class="branch-hero">
      <div :class="{ 'stamp-ghost': !hasVisited }">
        <StampShape :branch-code="branch.BranchCode" :ward-no="branch.WardNo" :size="72" />
      </div>
      <div class="branch-title-area">
        <h1>{{ branch.BranchName }}</h1>
        <p v-if="todayHours" class="branch-hours">Today {{ todayHours }}</p>
        <div class="branch-meta">
          <a :href="mapsUrl" target="_blank" rel="noopener" class="meta-item meta-link">
            <IconMapPin class="meta-icon" />
            {{ streetAddress }}
          </a>
          <a v-if="branch.Telephone" :href="`tel:${branch.Telephone}`" class="meta-item meta-link">
            <IconTelephone class="meta-icon" />
            {{ branch.Telephone }}
          </a>
          <span v-if="hasParking" class="meta-item">
            <IconParking class="meta-icon" />
            Parking
          </span>
        </div>
        <span v-if="compassPointDirection" class="compass-point-tag">
          Compass point · {{ compassPointDirection }}
        </span>
      </div>
    </div>

    <div class="checkin-area">
      <NuxtLink v-if="checkinState !== 'blocked'" :to="`/check-in?branch=${branch.BranchCode}`" class="checkin-btn">
        {{ checkinState === 'visited' ? 'Check in again' : 'Check in here' }}
      </NuxtLink>
      <button v-else class="checkin-btn blocked" disabled>
        Already visited today
      </button>
    </div>

    <BranchVisits v-if="pastVisitsHere.length" :branch-code="branch.BranchCode" />

    <section class="detail-section">
      <h2 class="detail-heading">Upcoming events</h2>
      <ul v-if="events.length" class="events-list">
        <li v-for="(evt, i) in events" :key="`${evt.date}-${i}`" class="event-row">
          <div class="event-date-badge">
            <span class="event-month">{{ formatEventMonth(evt.date) }}</span>
            <span class="event-day">{{ formatEventDay(evt.date) }}</span>
          </div>
          <div class="event-info">
            <span class="event-title">{{ evt.title }}</span>
            <span class="event-meta">{{ evt.time }}<template v-if="evt.age"> · {{ evt.age }}</template></span>
          </div>
        </li>
      </ul>
      <p v-else-if="!eventsPending" class="events-empty">No events today or tomorrow.</p>
      <a :href="branch.Website" target="_blank" rel="noopener" class="events-more" @click="trackTplLinkTapped">All events at this branch ↗</a>
    </section>

    <section v-if="services.length" class="detail-section">
      <h2 class="detail-heading">Programs &amp; services</h2>
      <div class="tag-list">
        <span v-for="s in services" :key="s" class="tag">{{ s }}</span>
      </div>
    </section>

    <section v-if="branchHistoryEntries.length" class="detail-section">
      <h2 class="detail-heading">Branch History</h2>
      <template v-if="pastVisitsHere.length === 0">
        <p class="history-locked">Check in here to start reading this branch's history.</p>
      </template>
      <template v-else>
        <div class="history-row">
          <div class="history-year-badge">
            <span class="history-year">{{ branchHistoryEntries[0]?.year }}</span>
          </div>
          <p class="history-detail">{{ branchHistoryEntries[0]?.detail }}</p>
        </div>
        <p class="history-locked">Come back to unlock more history.</p>
      </template>
    </section>

    <section v-if="nearbyBranches.length" class="detail-section">
      <h2 class="detail-heading">Nearby branches</h2>
      <NearbyBranchList
        :branches="nearbyBranches"
        :original-source="effectiveSource"
        :navigate-to-branch-page="nearbyAsRoute"
        from="branch_page"
        @select="emit('open-branch', $event)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import branchHours from '#data/branch-hours.json'
import branchHistoryData from '#data/branch-history.json'
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, haversineKm, formatDist } from '~/composables/useRegion'
import { compassPoints } from '~/composables/useBadges'
import { formatAudiences, formatEventTime } from '~/composables/useEvents'
import IconParking from './icons/IconParking.vue'
import IconTelephone from './icons/IconTelephone.vue'
import IconMapPin from './icons/IconMapPin.vue'
import IconChevron from './icons/IconChevron.vue'

const props = withDefaults(defineProps<{
  branch: Branch
  source?: string
  effectiveSource?: string
  nearbyAsRoute?: boolean
}>(), {
  source: 'explore',
  effectiveSource: '/explore',
  nearbyAsRoute: false,
})
const emit = defineEmits<{ 'open-branch': [branch: Branch] }>()

interface BranchEvent {
  Title?: string
  StartDateLocal?: string
  StartTime?: string
  Audiences?: string
}
const hoursByBranch: Record<string, Record<string, string> | undefined> = branchHours
const historyByBranch: Record<string, { year: string, detail: string }[] | undefined> = branchHistoryData
const passport = usePassportStore()
const { $posthog } = useNuxtApp()

onMounted(() => {
  $posthog?.capture('branch_viewed', {
    branch_code: props.branch.BranchCode,
    branch_name: props.branch.BranchName,
    district: props.branch.District ?? '',
    source: props.source,
  })
})

function trackTplLinkTapped() {
  $posthog?.capture('tpl_link_tapped', { branch_code: props.branch.BranchCode })
}


onMounted(() => {
  $posthog?.capture('branch_viewed', {
    branch_code: props.branch.BranchCode,
    branch_name: props.branch.BranchName,
    district:    props.branch.District ?? '',
    source:      props.source,
  })
})

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const todayHours = computed(() => {
  const hours = hoursByBranch[props.branch.BranchCode]
  return hours?.[DAYS[new Date().getDay()]!] ?? null
})
const streetAddress = computed(() => props.branch.Address?.split(',')[0] ?? '')
const mapsUrl = computed(() => {
  const q = encodeURIComponent(`${streetAddress.value}, Toronto, ON`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
})
const hasParking = computed(() =>
  props.branch.PublicParking && props.branch.PublicParking !== '0' && props.branch.PublicParking !== 0
)

const hasVisited = computed(() => passport.hasVisited(props.branch.BranchCode))
const checkinState = computed(() => {
  if (passport.hasVisitedToday(props.branch.BranchCode)) return 'blocked'
  if (hasVisited.value) return 'visited'
  return 'idle'
})

const SERVICE_FLAGS: Partial<Record<keyof Branch, string>> = {
  KidsStop: 'Kids Stop',
  LeadingReading: 'Leading to Reading',
  CLC: 'Computer Learning Centre',
  DIH: 'Digital Innovation Hub',
  TeenCouncil: 'Teen Council',
  YouthHub: 'Youth Hub',
  AdultLiteracyProgram: 'Adult Literacy Program',
}
const services = computed(() =>
  Object.entries(SERVICE_FLAGS)
    .filter(([key]) => props.branch[key as keyof Branch] === 1)
    .map(([, label]) => label)
)

const { data: rawEvents, pending: eventsPending } = useFetch('/api/branch-events', {
  query: computed(() => ({ library: props.branch.BranchName ?? '' })),
  default: (): BranchEvent[] => [],
  transform: (data: unknown): BranchEvent[] => Array.isArray(data) ? data : [],
})

const events = computed(() =>
  (rawEvents.value ?? []).map(e => ({
    title: e.Title || '(Unnamed event)',
    date: e.StartDateLocal ?? '',
    time: formatEventTime(e.StartTime),
    age: formatAudiences(e.Audiences),
  }))
)

function formatEventMonth(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short' }).toUpperCase()
}
function formatEventDay(date: string) {
  return new Date(date + 'T00:00:00').getDate()
}

const pastVisitsHere = computed(() =>
  passport.checkIns.filter(c => c.branchCode === props.branch.BranchCode)
)

// Branch history
const branchHistoryEntries = computed(() =>
  historyByBranch[props.branch.BranchCode] ?? []
)

const COMPASS_DIR_LABELS: Record<string, string> = { n: 'North', e: 'East', s: 'South', w: 'West' }
const compassPointDirection = computed(() => {
  const entry = Object.entries(compassPoints).find(([, code]) => code === props.branch.BranchCode)
  return entry ? (COMPASS_DIR_LABELS[entry[0]] ?? null) : null
})

const nearbyBranches = computed(() => {
  if (!props.branch.Lat || !props.branch.Long) return []
  return physicalBranches
    .filter(b => b.BranchCode !== props.branch.BranchCode)
    .map(b => ({ ...b, distKm: haversineKm(props.branch.Lat, props.branch.Long, b.Lat, b.Long) }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 2)
})
</script>

<style scoped>
.branch-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0 14px;
}

.stamp-ghost {
  opacity: 0.13;
  filter: grayscale(1);
  flex-shrink: 0;
}

.branch-title-area {
  & h1 {
    font-size: 1.25rem;
    line-height: 1.2;
    margin-bottom: 3px;
  }
}

.branch-hours {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 3px;
}

.compass-point-tag {
  display: inline-block;
  margin-top: 6px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-success);
}

.checkin-area {
  margin: 4px 0 20px;
}

.checkin-btn {
  display: flex;
  width: 100%;
  padding: 16px;
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-body);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background 0.2s, transform 0.1s;
  box-shadow: 0 4px 14px rgba(0, 95, 192, 0.32);
  text-decoration: none;

  &:active {
    transform: scale(0.98);
  }

  &.blocked {
    background: var(--color-text-muted);
    box-shadow: none;
    cursor: default;
    opacity: 0.7;
  }
}

.branch-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 5px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.meta-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  stroke: var(--color-text-muted);
}

.meta-link {
  color: var(--color-text-muted);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.detail-section {
  margin-bottom: 24px;
}

.detail-heading {
  font-size: 1rem;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.events-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.event-date-badge {
  flex-shrink: 0;
  width: 44px;
  background: color-mix(in srgb, var(--tpl-blue) 8%, var(--color-paper));
  border: 1px solid color-mix(in srgb, var(--tpl-blue) 20%, transparent);
  border-radius: var(--radius-sm);
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.event-month {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--tpl-blue);
}

.event-day {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1;
  color: var(--color-brand-text);
  font-optical-sizing: auto;
}

.event-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 2px;
}

.event-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.35;
}

.event-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.events-more {
  display: block;
  margin-top: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tpl-blue);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.events-empty {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.history-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.history-year-badge {
  flex-shrink: 0;
  width: 44px;
  background: color-mix(in srgb, var(--tpl-blue) 8%, var(--color-paper));
  border: 1px solid color-mix(in srgb, var(--tpl-blue) 20%, transparent);
  border-radius: var(--radius-sm);
  padding: 6px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-year {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--tpl-blue);
}

.history-detail {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
  padding-top: 2px;
}

.history-locked {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-style: italic;
}

</style>
