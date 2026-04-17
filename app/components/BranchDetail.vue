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
      <NuxtLink v-if="checkinState !== 'blocked'" :to="`/check-in?branch=${branch.BranchCode}`" class="checkin-btn"
                :class="{ visited: checkinState === 'visited' }"
      >
        {{ checkinState === 'visited' ? 'Check in again' : 'Check in here' }}
      </NuxtLink>
      <button v-else class="checkin-btn blocked" disabled>
        Already visited today
      </button>
    </div>

    <section v-if="pastVisitsHere.length" class="detail-section">
      <h2 class="detail-heading">Your visits here</h2>
      <ul class="visit-list">
        <li v-for="visit in pastVisitsHere" :key="visit.timestamp" class="visit-row-small">
          <div class="visit-row-header">
            <span class="visit-date">{{ formatVisitDate(visit.timestamp) }}</span>
            <div class="visit-actions">
              <label class="visit-action-btn" :title="visit.hasPhoto ? 'Change photo' : 'Add photo'">
                <IconPhoto class="visit-action-icon" />
                <input type="file" accept="image/*" class="visit-file-input" @change="onVisitPhotoCapture($event, visit.timestamp)" />
              </label>
              <button class="visit-action-btn" :title="editingNote === visit.timestamp ? 'Cancel' : 'Edit note'"
                      @click="toggleNoteEdit(visit.timestamp)"
              >
                <IconNote class="visit-action-icon" />
              </button>
            </div>
          </div>
          <button v-if="photoUrls[visit.timestamp]" class="visit-photo-btn"
                  @click="lightboxSrc = photoUrls[visit.timestamp]"
          >
            <img :src="photoUrls[visit.timestamp]" class="visit-photo-thumb" alt="Check-in photo" />
          </button>
          <template v-if="editingNote === visit.timestamp">
            <textarea v-model="noteInputs[visit.timestamp]" class="visit-note-input" placeholder="Add a note…" rows="3" />
            <div class="visit-note-actions">
              <button class="note-save-btn" @click="saveNote(visit.timestamp)">Save</button>
              <button class="note-cancel-btn" @click="editingNote = null">Cancel</button>
            </div>
          </template>
          <span v-else-if="visit.note" class="visit-note">{{ visit.note }}</span>
        </li>
      </ul>
    </section>

    <div v-if="lightboxSrc" class="lightbox" @click="lightboxSrc = null">
      <img :src="lightboxSrc" class="lightbox-img" alt="Check-in photo" />
    </div>

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
            <span class="history-year">{{ branchHistoryEntries[0].year }}</span>
          </div>
          <p class="history-detail">{{ branchHistoryEntries[0].detail }}</p>
        </div>
        <p class="history-locked">Come back to unlock more history.</p>
      </template>
    </section>

    <section v-if="nearbyBranches.length" class="detail-section">
      <h2 class="detail-heading">Nearby branches</h2>
      <NearbyBranchList :branches="nearbyBranches" :original-source="effectiveSource" from="branch_page" />
    </section>
  </div>
</template>

<script setup>
import branchHours from '#data/branch-hours.json'
import branchHistoryData from '#data/branch-history.json'
import { usePassportStore } from '~/stores/passport'
import { getPhotoUrl, savePhoto } from '~/composables/usePhotoStore'
import { physicalBranches, haversineKm, formatDist } from '~/composables/useRegion'
import { compassPoints } from '~/composables/useBadges'
import { getAuthBase } from '~/lib/config'
import { formatAudiences, formatEventTime } from '~/composables/useEvents'
import IconParking from './icons/IconParking.vue'
import IconTelephone from './icons/IconTelephone.vue'
import IconMapPin from './icons/IconMapPin.vue'
import IconChevron from './icons/IconChevron.vue'
import IconNote from './icons/IconNote.vue'
import IconPhoto from './icons/IconPhoto.vue'

const props = defineProps({
  branch: { type: Object, required: true },
  source: { type: String, default: 'explore' },
  effectiveSource: { type: String, default: '/explore' },
})
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

const hasVisited = computed(() => passport.hasVisited(props.branch.BranchCode))
const checkinState = computed(() => {
  if (passport.hasVisitedToday(props.branch.BranchCode)) return 'blocked'
  if (hasVisited.value) return 'visited'
  return 'idle'
})

const SERVICE_FLAGS = {
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
    .filter(([key]) => props.branch[key] === 1)
    .map(([, label]) => label)
)

const { data: rawEvents, pending: eventsPending } = useFetch('/api/branch-events', {
  query: computed(() => ({ library: props.branch.BranchName ?? '' })),
  default: () => [],
  transform: data => Array.isArray(data) ? data : [],
})

const events = computed(() =>
  (rawEvents.value ?? []).map(e => ({
    title: e.Title || '(Unnamed event)',
    date: e.StartDateLocal ?? '',
    time: formatEventTime(e.StartTime),
    age: formatAudiences(e.Audiences),
  }))
)

function formatEventMonth(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short' }).toUpperCase()
}
function formatEventDay(date) {
  return new Date(date + 'T00:00:00').getDate()
}

const pastVisitsHere = computed(() =>
  passport.checkIns.filter(c => c.branchCode === props.branch.BranchCode)
)

const photoUrls = ref({})
const lightboxSrc = ref(null)

watch(pastVisitsHere, async (visits) => {
  for (const visit of visits) {
    if (visit.timestamp in photoUrls.value) continue
    photoUrls.value[visit.timestamp] = null
    photoUrls.value[visit.timestamp] = await getPhotoUrl(visit.timestamp)
  }
}, { immediate: true })

onUnmounted(() => {
  Object.values(photoUrls.value).forEach(url => url && URL.revokeObjectURL(url))
})

function formatVisitDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Note editing
const editingNote = ref(null)
const noteInputs = ref({})

function toggleNoteEdit(timestamp) {
  if (editingNote.value === timestamp) {
    editingNote.value = null
  } else {
    noteInputs.value[timestamp] = pastVisitsHere.value.find(v => v.timestamp === timestamp)?.note ?? ''
    editingNote.value = timestamp
  }
}

function saveNote(timestamp) {
  passport.updateNote(timestamp, noteInputs.value[timestamp] ?? '')
  editingNote.value = null
}

// Photo adding on existing visits

function compressPhoto(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }
    img.src = url
  })
}

async function onVisitPhotoCapture(event, timestamp) {
  const file = event.target.files?.[0]
  if (!file) return
  const blob = await compressPhoto(file)
  await savePhoto(timestamp, blob)
  const oldUrl = photoUrls.value[timestamp]
  if (oldUrl) URL.revokeObjectURL(oldUrl)
  photoUrls.value[timestamp] = URL.createObjectURL(blob)
  try {
    const res = await fetch(`${getAuthBase()}/api/upload/photo?ext=jpg`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
    })
    if (res.ok) {
      const { publicUrl } = await res.json()
      if (publicUrl) passport.markCheckInHasPhoto(timestamp, publicUrl)
    } else {
      passport.markCheckInHasPhoto(timestamp)
    }
  } catch {
    passport.markCheckInHasPhoto(timestamp)
  }
}

// Branch history
const branchHistoryEntries = computed(() =>
  branchHistoryData[props.branch.BranchCode] ?? []
)

const COMPASS_DIR_LABELS = { n: 'North', e: 'East', s: 'South', w: 'West' }
const compassPointDirection = computed(() => {
  const entry = Object.entries(compassPoints).find(([, code]) => code === props.branch.BranchCode)
  return entry ? COMPASS_DIR_LABELS[entry[0]] : null
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

  &:active {
    transform: scale(0.98);
  }

  &.visited {
    background: transparent;
    color: var(--color-text-mid);
    box-shadow: none;
    border: 1.5px solid var(--color-border);
    font-size: 0.875rem;
    padding: 12px;
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

.visit-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.visit-row-small {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-sm);

  & .visit-date {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  & .visit-note {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }
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

.visit-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.visit-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.visit-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;

  &:hover { background: var(--color-border-soft); }
}

.visit-action-icon {
  width: 14px;
  height: 14px;
  stroke: var(--color-text-muted);
  flex-shrink: 0;
}

.visit-file-input {
  display: none;
}

.visit-note-input {
  width: 100%;
  padding: 8px 10px;
  margin-top: 8px;
  font-size: 0.875rem;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  resize: vertical;
  line-height: 1.5;
  box-sizing: border-box;

  &:focus { border-color: var(--tpl-blue); }
}

.visit-note-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.note-save-btn {
  padding: 5px 14px;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--font-body);
  background: var(--tpl-blue);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.note-cancel-btn {
  padding: 5px 14px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-body);
  background: none;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
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

.lightbox-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
}

</style>
