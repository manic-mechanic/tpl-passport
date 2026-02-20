<template>
  <main class="page-content" v-if="branch">

    <header class="branch-header">
      <NuxtLink to="/explore" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Explore
      </NuxtLink>

      <div class="branch-hero">
        <div class="stamp-preview" :style="stampStyles">
          <div class="stamp-ring-preview" />
          <span class="stamp-code-preview">{{ branch.BranchCode }}</span>
        </div>
        <div class="branch-title-area">
          <h1>{{ branch.BranchName }}</h1>
          <p class="branch-ward">{{ branch.WardName }}</p>
          <p class="branch-neighbourhood">{{ branch.NBHDName }}</p>
        </div>
      </div>
    </header>

    <!-- Check-in -->
    <div class="checkin-area">
      <button
        class="checkin-btn"
        :class="{
          'checkin-btn--visited':  checkinState === 'visited',
          'checkin-btn--success':  checkinState === 'success',
          'checkin-btn--blocked':  checkinState === 'blocked',
        }"
        :disabled="checkinState === 'blocked'"
        @click="openCheckInSheet"
      >
        <svg v-if="checkinState === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <template v-if="checkinState === 'success'">Stamp collected!</template>
        <template v-else-if="checkinState === 'blocked'">Already visited today</template>
        <template v-else-if="checkinState === 'visited'">Check in again</template>
        <template v-else>Check in here</template>
      </button>

      <button class="qr-hint" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="15" height="15">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          <rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/>
        </svg>
        Scan QR code · coming soon
      </button>
    </div>

    <!-- Info -->
    <section class="info-card card">
      <div class="info-row">
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <span>{{ branch.Address }}</span>
      </div>
      <div v-if="branch.Telephone" class="info-row">
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.8a2 2 0 011.72-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91"/>
        </svg>
        <a :href="`tel:${branch.Telephone}`" class="info-link">{{ branch.Telephone }}</a>
      </div>
      <div class="info-row">
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span class="info-hours-row">
          <span>Today's hours</span>
          <a v-if="branch.Website" :href="branch.Website" target="_blank" class="info-link hours-link">
            See tpl.ca ↗
          </a>
        </span>
      </div>
      <div v-if="branch.Workstations > 0" class="info-row">
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        </svg>
        <span>{{ branch.Workstations }} public computer{{ branch.Workstations !== 1 ? 's' : '' }}</span>
      </div>
      <div v-if="branch.PublicParking && branch.PublicParking !== '0' && branch.PublicParking !== 0" class="info-row">
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 010 6H9"/>
        </svg>
        <span>Parking: {{ branch.PublicParking === 'shared' ? 'shared' : `${branch.PublicParking} spaces` }}</span>
      </div>
    </section>

    <!-- Services -->
    <section v-if="services.length" class="detail-section">
      <h2 class="detail-heading">Programs &amp; services</h2>
      <div class="tag-list">
        <span v-for="s in services" :key="s" class="tag">{{ s }}</span>
      </div>
    </section>

    <!-- Upcoming events -->
    <section class="detail-section">
      <h2 class="detail-heading">Upcoming events</h2>
      <div v-if="eventsPending" class="events-loading">Loading events…</div>
      <ul v-else-if="upcomingEvents.length" class="events-list">
        <li v-for="evt in upcomingEvents" :key="evt._id" class="event-row">
          <div class="event-date-badge">
            <span class="event-month">{{ formatEventMonth(evt.startdate) }}</span>
            <span class="event-day">{{ formatEventDay(evt.startdate) }}</span>
          </div>
          <div class="event-info">
            <a :href="evt.pagelink" target="_blank" class="event-title">{{ evt.title }}</a>
            <span class="event-meta">
              <template v-if="evt.starttime && evt.starttime !== 'None'">{{ formatTime(evt.starttime) }}</template>
              <template v-if="evt.agegroup1 && evt.agegroup1 !== 'None'"> · {{ evt.agegroup1 }}</template>
            </span>
          </div>
        </li>
      </ul>
      <div v-else class="events-empty">
        <p>No upcoming events found for this branch.</p>
        <a v-if="branch.Website" :href="branch.Website" target="_blank" class="events-tpl-link">Check tpl.ca for the latest programs ↗</a>
      </div>
    </section>

    <!-- Past visits at this branch -->
    <section v-if="pastVisitsHere.length" class="detail-section">
      <h2 class="detail-heading">Your visits here</h2>
      <ul class="visit-list">
        <li v-for="visit in pastVisitsHere" :key="visit.timestamp" class="visit-row-small">
          <span class="visit-row-small__date">{{ formatVisitDate(visit.timestamp) }}</span>
          <span v-if="visit.note" class="visit-row-small__note">{{ visit.note }}</span>
        </li>
      </ul>
    </section>

  </main>

  <main class="page-content" v-else>
    <p class="empty-state">Branch not found.</p>
  </main>

  <!-- Check-in bottom sheet -->
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="showSheet" class="sheet-backdrop" @click.self="closeSheet">
        <div class="sheet">
          <div class="sheet-handle" />
          <div class="sheet-header">
            <div class="sheet-stamp" :style="stampStyles">
              <span>{{ branch?.BranchCode }}</span>
            </div>
            <div>
              <p class="sheet-title">Check in at</p>
              <p class="sheet-branch">{{ branch?.BranchName }}</p>
            </div>
          </div>
          <textarea
            v-model="noteText"
            class="note-textarea"
            placeholder="Add a note… (optional)"
            rows="3"
            maxlength="500"
          />
          <p class="note-count">{{ noteText.length }} / 500</p>
          <div class="sheet-actions">
            <button class="sheet-btn sheet-btn--cancel" @click="closeSheet">Cancel</button>
            <button class="sheet-btn sheet-btn--confirm" @click="confirmCheckIn">
              Collect stamp
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import branchData from '#data/tpl-branch-general-information-2023.json'
import { usePassportStore } from '~/stores/passport'
import { useStampColor } from '~/composables/useStampColor'

const route   = useRoute()
const passport = usePassportStore()

const branch = computed(() => branchData.find(b => b.BranchCode === route.params.id))

const stampStyles = computed(() => {
  if (!branch.value) return {}
  const { color, bg, border } = useStampColor(branch.value.WardNo)
  return { color, background: bg, borderColor: border }
})

// ── Check-in sheet ─────────────────────────────
const showSheet     = ref(false)
const flashSuccess  = ref(false)
const noteText      = ref('')

// Reactive button state — always reflects current store state
const checkinState = computed(() => {
  if (flashSuccess.value) return 'success'
  if (passport.hasVisitedToday(branch.value?.BranchCode)) return 'blocked'
  if (passport.hasVisited(branch.value?.BranchCode)) return 'visited'
  return 'idle'
})

function openCheckInSheet() {
  if (checkinState.value === 'blocked') return
  noteText.value = ''
  showSheet.value = true
}

function closeSheet() {
  showSheet.value = false
}

function confirmCheckIn() {
  const result = passport.checkIn(branch.value.BranchCode, noteText.value.trim())
  showSheet.value = false
  if (result) {
    flashSuccess.value = true
    setTimeout(() => { flashSuccess.value = false }, 2500)
  }
}

// ── Services ───────────────────────────────────
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

// ── Events (via server proxy) ───────────────────
const eventsRaw    = ref([])
const eventsPending = ref(false)

watch(
  () => branch.value?.BranchName,
  async (name) => {
    if (!name) return
    eventsPending.value = true
    try {
      eventsRaw.value = await $fetch('/api/branch-events', { params: { library: name } })
    } catch {
      eventsRaw.value = []
    } finally {
      eventsPending.value = false
    }
  },
  { immediate: true }
)

const today = new Date().toISOString().split('T')[0]

const upcomingEvents = computed(() =>
  eventsRaw.value
    .filter(e => e.enddate >= today)
    .sort((a, b) => a.startdate.localeCompare(b.startdate))
    .slice(0, 5)
)

function formatEventMonth(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short' }).toUpperCase()
}

function formatEventDay(date) {
  return new Date(date + 'T00:00:00').getDate()
}

function formatTime(t) {
  if (!t || t === 'None') return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`
}

// ── Past visits ────────────────────────────────
const pastVisitsHere = computed(() =>
  passport.checkIns.filter(c => c.branchCode === branch.value?.BranchCode)
)

function formatVisitDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
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

.stamp-preview {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2.5px solid currentColor;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stamp-ring-preview {
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  opacity: 0.35;
}

.stamp-code-preview {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  font-optical-sizing: auto;
}

.branch-title-area h1 { font-size: 1.35rem; line-height: 1.2; margin-bottom: 3px; }
.branch-ward         { font-size: 0.8rem; color: var(--color-text-mid); font-weight: 600; }
.branch-neighbourhood { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 1px; }

/* Check-in */
.checkin-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 18px 0 20px;
}

.checkin-btn {
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background 0.2s, transform 0.1s;
  box-shadow: 0 4px 14px rgba(0, 95, 192, 0.32);
}
.checkin-btn:active { transform: scale(0.98); }
.checkin-btn--visited { background: var(--tpl-navy); box-shadow: none; }
.checkin-btn--success { background: #1a7f4b; box-shadow: 0 4px 14px rgba(26,127,75,0.3); }
.checkin-btn--blocked { background: var(--color-text-muted); box-shadow: none; cursor: default; opacity: 0.7; }

.qr-hint {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: var(--color-text-muted);
  border: 1.5px dashed var(--color-border);
  border-radius: var(--radius);
  font-size: 0.78rem;
  font-family: var(--font-body);
  cursor: not-allowed;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

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

.info-hours-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.hours-link { font-size: 0.8rem; }

/* Generic detail section */
.detail-section { margin-bottom: 24px; }

.detail-heading {
  font-size: 1rem;
  margin-bottom: 12px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Events */
.events-loading { font-size: 0.85rem; color: var(--color-text-muted); padding: 8px 0; }

.events-empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.events-empty p { font-size: 0.85rem; color: var(--color-text-muted); }

.events-tpl-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--tpl-blue);
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
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-title:hover { color: var(--tpl-blue); }

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

/* Bottom sheet */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 28, 113, 0.4);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet {
  background: var(--color-paper);
  border-radius: 20px 20px 0 0;
  padding: 12px 20px 40px;
  width: 100%;
  max-width: 480px;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  margin: 0 auto 20px;
}

.sheet-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.sheet-stamp {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 700;
  font-optical-sizing: auto;
}

.sheet-title {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.sheet-branch {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  font-optical-sizing: auto;
  color: var(--tpl-navy);
}

.note-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  resize: none;
  line-height: 1.5;
  transition: border-color 0.15s;
}

.note-textarea:focus { border-color: var(--tpl-blue); }

.note-count {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  text-align: right;
  margin: 4px 2px 16px;
}

.sheet-actions {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
}

.sheet-btn {
  padding: 14px;
  border-radius: var(--radius);
  font-size: 0.95rem;
  font-weight: 700;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}

.sheet-btn--cancel {
  background: var(--color-border-soft);
  color: var(--color-text-muted);
}

.sheet-btn--confirm {
  background: var(--tpl-blue);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,95,192,0.3);
}

/* Sheet transition */
.sheet-enter-active, .sheet-leave-active {
  transition: opacity 0.2s ease;
}
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>
