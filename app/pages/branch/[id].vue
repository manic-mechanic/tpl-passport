<template>
  <main class="page-content" v-if="branch">

    <header class="branch-header">
      <NuxtLink :to="backTo" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        {{ backLabel }}
      </NuxtLink>

      <div class="branch-hero">
        <StampShape :branchCode="branch.BranchCode" :wardNo="branch.WardNo" :size="72" />
        <div class="branch-title-area">
          <h1>{{ branch.BranchName }}</h1>
          <p class="branch-region">{{ branchRegion }}</p>
          <p class="branch-hours">Mon–Fri 10am–8pm · Sat &amp; Sun 10am–6pm</p>
        </div>
      </div>
    </header>

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

    <!-- Upcoming events (live from CKAN API) -->
    <section v-if="events.length" class="detail-section">
      <h2 class="detail-heading">Upcoming events</h2>
      <ul class="events-list">
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
      <a :href="`https://tpl.ca/locations/${branch.BranchCode}/`" target="_blank" rel="noopener" class="events-more">All events at this branch ↗</a>
    </section>

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

    <section class="info-card card">
      <div class="info-row">
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <a :href="mapsUrl" target="_blank" rel="noopener" class="info-link">{{ streetAddress }} ↗</a>
      </div>
      <div v-if="branch.Telephone" class="info-row">
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.8a2 2 0 011.72-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91"/>
        </svg>
        <a :href="`tel:${branch.Telephone}`" class="info-link">{{ branch.Telephone }}</a>
      </div>
      <div v-if="hasParking" class="info-row">
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 010 6H9"/>
        </svg>
        <span>Parking available</span>
      </div>
    </section>

    <section v-if="services.length" class="detail-section">
      <h2 class="detail-heading">Programs &amp; services</h2>
      <div class="tag-list">
        <span v-for="s in services" :key="s" class="tag">{{ s }}</span>
      </div>
    </section>

    <section v-if="passport.hasVisited(branch.BranchCode)" class="detail-section">
      <h2 class="detail-heading">
        Branch challenges
        <span class="challenge-tally">{{ completedHere }}/{{ BRANCH_CHALLENGES.length }} completed</span>
      </h2>
      <ul class="challenge-list">
        <li
          v-for="(challenge, i) in challengeStates"
          :key="i"
          class="challenge-item"
          :class="{ 'challenge-item--done': challenge.done }"
          @click="passport.toggleChallenge(branch.BranchCode, i)"
        >
          <svg class="challenge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <!-- Book icon -->
            <template v-if="i === 0">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </template>
            <!-- Calendar icon -->
            <template v-else-if="i === 1">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </template>
            <!-- Person icon -->
            <template v-else>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </template>
          </svg>
          <span class="challenge-label">{{ challenge.label }}</span>
          <svg v-if="challenge.done" class="challenge-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </li>
      </ul>
    </section>

  </main>

  <main class="page-content" v-else>
    <p class="empty-state">Branch not found.</p>
  </main>
</template>

<script setup>
import branchData from '#data/updated-branch-info.json'
import { usePassportStore } from '~/stores/passport'
import { getPhotoUrl } from '~/composables/usePhotoStore'

const route  = useRoute()
const router = useRouter()

// Return to wherever the user came from, falling back to /explore
const backTo    = computed(() => router.options.history.state?.back ?? '/explore')
const backLabel = computed(() => {
  if (backTo.value.startsWith('/history'))  return 'History'
  if (backTo.value.startsWith('/passport')) return 'Passport'
  return 'Explore'
})
const passport = usePassportStore()

const branch = computed(() => branchData.find(b => b.BranchCode === route.params.id))

const branchRegion  = computed(() => branch.value?.District ?? '')
const streetAddress = computed(() => branch.value?.Address?.split(',')[0] ?? '')
const mapsUrl       = computed(() => {
  if (!branch.value) return '#'
  const q = encodeURIComponent(`${streetAddress.value}, Toronto, ON`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
})
const hasParking = computed(() =>
  branch.value?.PublicParking &&
  branch.value.PublicParking !== '0' &&
  branch.value.PublicParking !== 0
)

const checkinState = computed(() => {
  if (passport.hasVisitedToday(branch.value?.BranchCode)) return 'blocked'
  if (passport.hasVisited(branch.value?.BranchCode)) return 'visited'
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

const services = computed(() => {
  if (!branch.value) return []
  return Object.entries(SERVICE_FLAGS)
    .filter(([key]) => branch.value[key] === 1)
    .map(([, label]) => label)
})

// Events proxied via /api/branch-events — CKAN doesn't send CORS headers so direct browser calls fail
const { data: rawEvents } = useFetch('/api/branch-events', {
  query: computed(() => ({ library: branch.value?.BranchName ?? '' })),
  default: () => [],
  transform: data => Array.isArray(data) ? data : [],
})
const AUDIENCE_MAP = {
  'Adults (18+)':               'Adults',
  'Older Adults':               'Seniors',
  'Younger Adults (18-24)':     'Ages 18–24',
  'Teens (13-17)':              'Teens',
  'School Age Children (6-12)': 'Kids 6–12',
  'Preschool Children (0-5)':   'Ages 0–5',
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
  passport.checkIns.filter(c => c.branchCode === branch.value?.BranchCode)
)

const photoUrls  = ref({})
const lightboxSrc = ref(null)

watch(pastVisitsHere, async (visits) => {
  for (const visit of visits) {
    if (visit.timestamp in photoUrls.value) continue
    photoUrls.value[visit.timestamp] = null  // claim slot before await to prevent duplicate loads
    photoUrls.value[visit.timestamp] = await getPhotoUrl(visit.timestamp)
  }
}, { immediate: true })

function formatVisitDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

const BRANCH_CHALLENGES = [
  { label: 'Check out a book here'   },
  { label: 'Attend a branch program' },
  { label: 'Meet a librarian'        },
]

const challengeStates = computed(() =>
  BRANCH_CHALLENGES.map((c, i) => ({
    ...c,
    done: passport.hasCompletedChallenge(branch.value?.BranchCode, i),
  }))
)

const completedHere = computed(() =>
  challengeStates.value.filter(c => c.done).length
)
</script>

<style scoped>
/* Header */
.branch-header { padding: 20px 0 14px; }

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--tpl-blue);
  margin-bottom: 18px;
}
.back-link svg { width: 16px; height: 16px; }

.branch-hero {
  display: flex;
  align-items: center;
  gap: 16px;
}

.branch-title-area h1  { font-size: 1.35rem; line-height: 1.2; margin-bottom: 3px; }
.branch-region         { font-size: 0.8rem; color: var(--color-text-mid); font-weight: 600; margin-top: 2px; }
.branch-hours          { font-size: 0.72rem; color: var(--color-text-muted); margin-top: 3px; }

/* Check-in */
.checkin-area {
  margin: 18px 0 20px;
}

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
.checkin-btn--visited { background: var(--tpl-navy); box-shadow: none; }
.checkin-btn--blocked { background: var(--color-text-muted); box-shadow: none; cursor: default; opacity: 0.7; }

/* Info card */
.info-card {
  padding: 4px 16px;
  margin-bottom: 22px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid var(--color-border-soft);
  font-size: 0.875rem;
}
.info-row:last-child { border-bottom: none; }

.info-icon {
  width: 16px; height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
  stroke: var(--color-text-muted);
}

.info-link { color: var(--tpl-blue); font-weight: 500; }

/* Generic detail section */
.detail-section { margin-bottom: 24px; }

.detail-heading {
  font-size: 1rem;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.challenge-tally {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Events */
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
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--tpl-blue);
}

.event-day {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1;
  color: var(--tpl-navy);
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

.events-more {
  display: block;
  margin-top: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--tpl-blue);
  text-decoration: none;
}

.events-more:hover { text-decoration: underline; }

.event-meta {
  font-size: 0.73rem;
  color: var(--color-text-muted);
}

/* Past visits */
.visit-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.visit-row-small {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-sm);
}

.visit-row-small__date {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text);
}

.visit-row-small__note {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.visit-photo-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: block;
  width: 100%;
  margin-top: 8px;
}

.visit-photo-thumb {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation: lightbox-in 0.2s ease both;
}

@keyframes lightbox-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.lightbox-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
}

/* Branch challenges */
.challenge-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.challenge-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  user-select: none;
}

.challenge-item:active {
  background: var(--color-paper);
}

.challenge-item--done {
  color: var(--color-text);
  background: color-mix(in srgb, var(--tpl-blue) 5%, var(--color-surface));
  border-color: color-mix(in srgb, var(--tpl-blue) 22%, transparent);
}

.challenge-label {
  flex: 1;
}

.challenge-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: var(--color-text-muted);
  transition: stroke 0.12s;
}

.challenge-item--done .challenge-icon {
  stroke: var(--tpl-blue);
}

.challenge-check {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke: var(--tpl-blue);
}
</style>
