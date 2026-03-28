<template>
  <div v-if="branch">
    <div class="branch-hero">
      <div :class="{ 'stamp-ghost': !hasVisited }">
        <StampShape :branchCode="branch.BranchCode" :wardNo="branch.WardNo" :size="72" />
      </div>
      <div class="branch-title-area">
        <h1>{{ branch.BranchName }}</h1>
        <p v-if="todayHours" class="branch-hours">Today {{ todayHours }}</p>
        <div class="branch-meta">
          <a :href="mapsUrl" target="_blank" rel="noopener" class="meta-item meta-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="meta-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {{ streetAddress }}
          </a>
          <a v-if="branch.Telephone" :href="`tel:${branch.Telephone}`" class="meta-item meta-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="meta-icon"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.8a2 2 0 011.72-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91"/></svg>
            {{ branch.Telephone }}
          </a>
          <span v-if="hasParking" class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="meta-icon"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 010 6H9"/></svg>
            Parking
          </span>
        </div>
        <span v-if="compassPointDirection" class="compass-point-tag">
          Compass point · {{ compassPointDirection }}
        </span>
      </div>
    </div>

    <div class="checkin-area">
      <NuxtLink
        v-if="checkinState !== 'blocked'"
        :to="`/check-in?branch=${branch.BranchCode}`"
        class="checkin-btn"
        :class="{ 'checkin-btn--visited': checkinState === 'visited' }"
      >
        {{ checkinState === 'visited' ? 'Check in again' : 'Check in here' }}
      </NuxtLink>
      <button v-else class="checkin-btn checkin-btn--blocked" disabled>
        Already visited today
      </button>
    </div>

    <section v-if="pastVisitsHere.length" class="detail-section">
      <h2 class="detail-heading">Your visits here</h2>
      <ul class="visit-list">
        <li v-for="visit in pastVisitsHere" :key="visit.timestamp" class="visit-row-small">
          <span class="visit-row-small__date">{{ formatVisitDate(visit.timestamp) }}</span>
          <button
            v-if="photoUrls[visit.timestamp]"
            class="visit-photo-btn"
            @click="lightboxSrc = photoUrls[visit.timestamp]"
          >
            <img :src="photoUrls[visit.timestamp]" class="visit-photo-thumb" alt="Check-in photo" />
          </button>
          <span v-if="visit.note" class="visit-row-small__note">{{ visit.note }}</span>
        </li>
      </ul>
    </section>

    <div v-if="lightboxSrc" class="lightbox" @click="lightboxSrc = null">
      <img :src="lightboxSrc" class="lightbox-img" alt="Check-in photo" />
    </div>

    <section class="detail-section">
      <h2 class="detail-heading">Upcoming events</h2>
      <ul v-if="events.length" class="events-list">
        <li v-for="evt in events" :key="evt.title + evt.date + evt.time" class="event-row">
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
      <a :href="branch.Website" target="_blank" rel="noopener" class="events-more">All events at this branch ↗</a>
    </section>

    <section v-if="services.length" class="detail-section">
      <h2 class="detail-heading">Programs &amp; services</h2>
      <div class="tag-list">
        <span v-for="s in services" :key="s" class="tag">{{ s }}</span>
      </div>
    </section>

    <section v-if="nearbyBranches.length" class="detail-section">
      <h2 class="detail-heading">Nearby branches</h2>
      <div class="nearby-list">
        <NuxtLink
          v-for="nb in nearbyBranches"
          :key="nb.BranchCode"
          :to="`/branch/${nb.BranchCode}`"
          class="nearby-row"
        >
          <StampShape :branchCode="nb.BranchCode" :wardNo="nb.WardNo" :size="36" />
          <div class="nearby-info">
            <span class="nearby-name">{{ nb.BranchName }}</span>
            <span class="nearby-dist">{{ formatDist(nb.distKm) }} away</span>
          </div>
          <svg class="nearby-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup>
import branchData from '#data/updated-branch-info.json'
import branchHours from '#data/branch-hours.json'
import { usePassportStore } from '~/stores/passport'
import { getPhotoUrl } from '~/composables/usePhotoStore'
import { haversineKm, formatDist, compassPoints } from '~/composables/useRegion'

const props = defineProps({ branch: { type: Object, required: true } })
const passport = usePassportStore()

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const todayHours = computed(() => {
  const hours = branchHours[props.branch.BranchCode]
  return hours?.[DAYS[new Date().getDay()]] ?? null
})
const streetAddress = computed(() => props.branch.Address?.split(',')[0] ?? '')
const mapsUrl = computed(() => {
  const q = encodeURIComponent(`${streetAddress.value}, Toronto, ON`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
})
const hasParking = computed(() =>
  props.branch.PublicParking && props.branch.PublicParking !== '0' && props.branch.PublicParking !== 0
)

const hasVisited   = computed(() => passport.hasVisited(props.branch.BranchCode))
const checkinState = computed(() => {
  if (passport.hasVisitedToday(props.branch.BranchCode)) return 'blocked'
  if (hasVisited.value) return 'visited'
  return 'idle'
})

const SERVICE_FLAGS = {
  KidsStop:             'Kids Stop',
  LeadingReading:       'Leading to Reading',
  CLC:                  'Computer Learning Centre',
  DIH:                  'Digital Innovation Hub',
  TeenCouncil:          'Teen Council',
  YouthHub:             'Youth Hub',
  AdultLiteracyProgram: 'Adult Literacy Program',
}
const services = computed(() =>
  Object.entries(SERVICE_FLAGS)
    .filter(([key]) => props.branch[key] === 1)
    .map(([, label]) => label)
)

const { data: rawEvents, pending: eventsPending } = useFetch('/api/branch-events', {
  query: computed(() => ({ library: props.branch.BranchName ?? '' })),
  default: () => [],
  transform: data => Array.isArray(data) ? data : [],
})

const AUDIENCE_MAP = {
  'Adults (18+)': 'Adults', 'Older Adults': 'Seniors',
  'Younger Adults (18-24)': 'Ages 18–24', 'Teens (13-17)': 'Teens',
  'School Age Children (6-12)': 'Kids 6–12', 'Preschool Children (0-5)': 'Ages 0–5',
}
const ADULT_GROUPS = new Set(['Adults (18+)', 'Older Adults', 'Younger Adults (18-24)'])
const KID_GROUPS   = new Set(['Teens (13-17)', 'School Age Children (6-12)', 'Preschool Children (0-5)'])

function formatAudiences(raw) {
  if (!raw) return ''
  const groups = raw.split(',').map(a => a.trim())
  const adults = groups.filter(g => ADULT_GROUPS.has(g))
  const kids   = groups.filter(g => KID_GROUPS.has(g))
  if (adults.length >= 1 && kids.length >= 1) return 'All ages'
  if (adults.length >= 2) return 'Adults'
  if (kids.length >= 2)   return 'Kids'
  return groups.map(g => AUDIENCE_MAP[g] ?? g).join(', ')
}

const events = computed(() =>
  (rawEvents.value ?? []).map(e => ({
    title: e.Title || '(Unnamed event)',
    date:  e.StartDateLocal ?? '',
    time:  formatEventTime(e.StartTime),
    age:   formatAudiences(e.Audiences),
  }))
)

function formatEventTime(isoDatetime) {
  if (!isoDatetime) return ''
  const tIdx = isoDatetime.indexOf('T')
  if (tIdx === -1) return ''
  const [h, m] = isoDatetime.slice(tIdx + 1).split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return ''
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`
}
function formatEventMonth(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short' }).toUpperCase()
}
function formatEventDay(date) {
  return new Date(date + 'T00:00:00').getDate()
}

const pastVisitsHere = computed(() =>
  passport.checkIns.filter(c => c.branchCode === props.branch.BranchCode)
)

const photoUrls   = ref({})
const lightboxSrc = ref(null)

watch(pastVisitsHere, async (visits) => {
  for (const visit of visits) {
    if (visit.timestamp in photoUrls.value) continue
    photoUrls.value[visit.timestamp] = null
    photoUrls.value[visit.timestamp] = await getPhotoUrl(visit.timestamp)
  }
}, { immediate: true })

function formatVisitDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

const COMPASS_DIR_LABELS = { n: 'North', e: 'East', s: 'South', w: 'West' }
const compassPointDirection = computed(() => {
  const entry = Object.entries(compassPoints).find(([, code]) => code === props.branch.BranchCode)
  return entry ? COMPASS_DIR_LABELS[entry[0]] : null
})

const nearbyBranches = computed(() => {
  if (!props.branch.Lat || !props.branch.Long) return []
  return branchData
    .filter(b => b.PhysicalBranch === 1 && b.BranchCode !== props.branch.BranchCode)
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

.stamp-ghost { opacity: 0.13; filter: grayscale(1); flex-shrink: 0; }

.branch-title-area h1  { font-size: 1.35rem; line-height: 1.2; margin-bottom: 3px; }
.branch-hours          { font-size: 0.72rem; color: var(--color-text-muted); margin-top: 3px; }
.compass-point-tag {
  display: inline-block;
  margin-top: 6px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1e7a5a;
}

.checkin-area { margin: 4px 0 20px; }
.checkin-btn {
  display: flex;
  width: 100%;
  padding: 16px;
  background: var(--tpl-blue);
  color: white;
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
}
.checkin-btn:active { transform: scale(0.98); }
.checkin-btn--visited {
  background: transparent;
  color: var(--color-text-mid);
  box-shadow: none;
  border: 1.5px solid var(--color-border);
  font-size: 0.9rem;
  padding: 12px;
}
.checkin-btn--blocked { background: var(--color-text-muted); box-shadow: none; cursor: default; opacity: 0.7; }

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
  font-size: 0.72rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}
.meta-icon { width: 12px; height: 12px; flex-shrink: 0; stroke: var(--color-text-muted); }
.meta-link { color: var(--color-text-muted); text-decoration: none; }
.meta-link:hover { text-decoration: underline; }

.detail-section { margin-bottom: 24px; }
.detail-heading { font-size: 1rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }

.tag-list { display: flex; flex-wrap: wrap; gap: 8px; }

.events-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.event-row { display: flex; align-items: flex-start; gap: 12px; }
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
.event-month { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.06em; color: var(--tpl-blue); }
.event-day { font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; line-height: 1; color: var(--tpl-navy); font-optical-sizing: auto; }
.event-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; padding-top: 2px; }
.event-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text); line-height: 1.35; }
.event-meta { font-size: 0.73rem; color: var(--color-text-muted); }
.events-more { display: block; margin-top: 10px; font-size: 0.8rem; font-weight: 600; color: var(--tpl-blue); text-decoration: none; }
.events-more:hover { text-decoration: underline; }
.events-empty { font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 8px; }

.visit-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
.visit-row-small {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-sm);
}
.visit-row-small__date { font-size: 0.82rem; font-weight: 600; color: var(--color-text); }
.visit-row-small__note { font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.5; }
.visit-photo-btn { background: none; border: none; padding: 0; cursor: pointer; display: block; width: 100%; margin-top: 8px; }
.visit-photo-thumb { width: 100%; max-height: 160px; object-fit: cover; border-radius: var(--radius-sm); display: block; }

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.lightbox-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: var(--radius-sm); }

.nearby-list { display: flex; flex-direction: column; gap: 8px; }
.nearby-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--color-text);
  transition: background 0.12s;
}
.nearby-row:active { background: var(--color-paper); }
.nearby-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nearby-name { font-size: 0.875rem; font-weight: 600; line-height: 1.3; }
.nearby-dist { font-size: 0.75rem; color: var(--color-text-muted); }
.nearby-arrow { width: 16px; height: 16px; flex-shrink: 0; stroke: var(--color-text-muted); }
</style>
