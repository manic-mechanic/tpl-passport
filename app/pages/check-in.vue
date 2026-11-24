<template>
  <main class="page-content page-centered" :class="{ 'page-fit': mode === 'pick' }">
    <PageBanner v-if="mode === 'pick'" title="Which branch?" back-label="Check in" @back="mode = 'here'">
      <template #action>
        <button type="button" class="search-btn" :aria-label="picker?.searchOpen ? 'Close search' : 'Search branches'"
                :aria-expanded="!!picker?.searchOpen" @click="picker?.toggleSearch()"
        >
          <IconClose v-if="picker?.searchOpen" aria-hidden="true" />
          <IconSearch v-else aria-hidden="true" />
        </button>
      </template>
    </PageBanner>
    <PageBanner v-else title="Check in" />

    <CheckInPicker v-if="mode === 'pick'" ref="picker" :initial-code="pickInitial" :position="knownPosition" @stamp="stampPicked" />

    <!-- At a branch: the scene, then the branch card with its stamp over both -->
    <div v-else-if="selectedBranch" class="here" :class="`here--${view}`">
      <CheckInScene class="here-scene" :view="view" :branch="selectedBranch" :last-visit="lastVisitLabel" />

      <div class="here-card">
        <button class="here-stamp" :aria-label="`About ${selectedBranch.BranchName}`" @click="branchSheetOpen = true">
          <StampShape :branch-code="selectedBranch.BranchCode" :ward-no="selectedBranch.WardNo" :size="132" />
        </button>
        <h2 class="here-name">{{ selectedBranch.BranchName }}</h2>
        <p v-if="isHere" class="here-status here-status--here">You're here</p>
        <p v-else-if="nearestDistance" class="here-status">{{ nearestDistance }} away</p>

        <p v-if="alreadyVisitedToday" class="here-notice" role="status">
          <IconVisited aria-hidden="true" />
          You've already checked in here today
        </p>

        <button class="checkin-btn" :disabled="alreadyVisitedToday || isCheckingLocation" @click="doCheckIn">
          <span v-if="isCheckingLocation" class="btn-spinner" />
          {{ isCheckingLocation ? 'Checking location…' : 'Stamp my passport' }}
        </button>

        <p v-if="locationStatus === 'too-far'" class="location-error">
          You're {{ locationDistFormatted }} away. Check in from within 100 m of the branch.
        </p>
        <p v-else-if="locationStatus === 'timeout'" class="location-error">
          Location check timed out. Check your signal and try again.
        </p>
        <p v-else-if="locationStatus === 'denied'" class="location-error">
          Check-in needs your location. {{ settingsHint }}
        </p>
        <p v-else-if="locationStatus === 'failed'" class="location-error">
          Couldn't get your location. Try again.
        </p>
        <p v-else-if="switchedFrom" class="location-note">
          You're nearer {{ selectedBranch.BranchName }} than {{ switchedFrom }}. Check in here instead.
        </p>

        <button type="button" class="pick-link" @click="openPicker">Pick another branch</button>
      </div>
    </div>

    <!-- Location blocked: say how to turn it back on -->
    <div v-else-if="access === 'denied' || access === 'unavailable'" class="locate-area">
      <p class="locate-message">
        <template v-if="access === 'unavailable'">Finding the nearest branch needs your location, and this device can't share it.</template>
        <template v-else>Finding the nearest branch needs your location. {{ settingsHint }}</template>
      </p>
      <button type="button" class="checkin-btn locate-btn" @click="openPicker">Pick a branch</button>
    </div>

    <!-- No location yet: an empty stamp to fill in -->
    <div v-else class="locate-area">
      <div v-if="FEATURES.qrCheckIn" class="qr-primary-area">
        <button class="qr-btn-primary" @click="openScanner">
          <IconQR />
          Scan QR code
        </button>
        <p class="or-divider">or</p>
      </div>
      <button class="stamp-btn" tabindex="-1" aria-hidden="true" :disabled="detecting" @click="detectNearest">
        <LocateStamp :busy="detecting" />
      </button>
      <p v-if="locateFailed" class="locate-message">Couldn't get your location.</p>
      <button class="checkin-btn locate-btn" :disabled="detecting" @click="detectNearest">
        <span v-if="detecting" class="btn-spinner" />
        {{ detecting ? 'Finding nearest branch…' : locateFailed ? 'Try again' : 'Find nearest branch' }}
      </button>
      <button type="button" class="pick-link" @click="openPicker">Pick a branch</button>
    </div>

    <p v-if="scanError" class="scan-error">{{ scanError }}</p>
  </main>

  <!-- ── Branch card ───── -->
  <BaseSheet v-model:open="branchSheetOpen" :height="branchSheetHeight">
    <BranchDetail v-if="selectedBranch" :branch="selectedBranch" source="checkin" />
  </BaseSheet>

  <!-- ── QR Scanner overlay ────────── -->
  <QrScannerOverlay
    v-if="FEATURES.qrCheckIn"
    v-model:active="scannerActive"
    @scanned="onQrScanned"
    @error="scanError = $event"
  />
</template>

<script setup lang="ts">
import { usePassportStore } from '~/stores/passport'
import { sortedBranches, haversineKm, formatDist } from '~/composables/useRegion'
import { shouldSkipLocationCheck } from '~/lib/locationCheck'
import { visitPath } from '~/lib/visitPhoto'
import { daysAgo, timestampForDay } from '~/lib/checkInDate'
import { nextCheckInView } from '~/lib/checkInView'
import { FEATURES } from '~/composables/useFeatureFlags'
import IconVisited from '~/components/icons/IconVisited.vue'
import IconQR from '~/components/icons/IconQR.vue'
import IconClose from '~/components/icons/IconClose.vue'
import IconSearch from '~/components/icons/IconSearch.vue'
import {
  cachedPosition, freshPosition, getPosition, locationAccess, locationSettingsHint,
  type Coords, type LocationAccess,
} from '~/lib/geolocation'

// Checking in needs a location within FENCE_KM of the branch. The fence check
// accepts a cached position only when it is this recent and already inside
// the fence; a cached "too far" always gets a fresh fix, so a stale position
// never blocks someone who has just arrived.
const FENCE_MAX_AGE_MS = 2 * 60 * 1000
const FENCE_KM = 0.1

const { $posthog } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const passport = usePassportStore()

// Every "Check in" entry point (Home, the welcome sheet, the nav orb) sets
// { locate: true }: the tap was about checking in, so finding the nearest
// branch, and the browser's location prompt with it, can start straight away.
const locateOnArrival = router.options.history.state?.locate === true

// ?branch= from a branch page. An unknown code (a stale link, a renamed
// branch) is ignored, so the page falls back to finding the nearest branch.
const queryCode = typeof route.query.branch === 'string' ? route.query.branch : ''
const prefilled = sortedBranches.some(b => b.BranchCode === queryCode)  // static — query string doesn't change after load
const selectedCode = ref(prefilled ? queryCode : '')
const scanned = ref(false)
const detecting = ref(false)
const locateFailed = ref(false)
const access = ref<LocationAccess>('unknown')
// Distance to the nearest branch, and which branch it was measured to, so
// it never shows under a different branch.
const nearest = ref<{ code: string, km: number } | null>(null)
const position = ref<Coords | null>(null)
// Name of the branch the check-in moved away from, when a fresh fix showed
// another branch is nearer.
const switchedFrom = ref('')
const branchSheetOpen = ref(false)
const branchSheetHeight = 'calc(100svh - var(--nav-height) - 60px)'

// 'pick': "Pick another branch", any branch and day, no location check.
const mode = ref<'here' | 'pick'>('here')
const picker = ref<{ toggleSearch: () => void, searchOpen: boolean } | null>(null)
// The scene above the branch card, a different one from last time.
const view = nextCheckInView()

const settingsHint = import.meta.client
  ? locationSettingsHint(navigator.userAgent, /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  : ''

// Dev builds with the location check switched off.
const skipLocationCheck = computed(() => {
  const { public: { isDev, bypassGeofence } } = useRuntimeConfig()
  return shouldSkipLocationCheck({
    isDev: !!isDev,
    bypassGeofence: !!bypassGeofence,
    profileBypass: !!passport.profile.bypassLocationFence,
  })
})

const selectedBranch = computed(() =>
  selectedCode.value
    ? sortedBranches.find(b => b.BranchCode === selectedCode.value) ?? null
    : null
)

const nearestDistance = computed(() =>
  nearest.value && nearest.value.code === selectedCode.value ? formatDist(nearest.value.km) : ''
)
const isHere = computed(() =>
  !!nearest.value && nearest.value.code === selectedCode.value && nearest.value.km <= FENCE_KM
)

// The diary scene's caption: the last time this branch was stamped.
const lastVisitLabel = computed(() => {
  const code = selectedCode.value
  const last = passport.checkIns.find(c => c.branchCode === code)
  if (!last) return ''
  return new Date(last.timestamp).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }).replace(/\./g, '')
})

// Where you are, if known: for the picker's distances.
const knownPosition = computed<Coords | null>(() => position.value ?? cachedPosition())
// The picker starts on the nearest branch, else the home branch.
const pickInitial = computed(() => nearest.value?.code || passport.profile.homeBranch || '')

function nearestTo(lat: number, lng: number) {
  return sortedBranches
    .map(b => ({ code: b.BranchCode, km: haversineKm(lat, lng, b.Lat, b.Long) }))
    .sort((a, b) => a.km - b.km)[0]!  // sortedBranches is never empty
}

async function detectNearest() {
  if (detecting.value) return
  detecting.value = true
  locateFailed.value = false
  let outcome: 'found' | 'denied' | 'failed' = 'failed'
  try {
    const pos = await getPosition({ timeout: 10000 })
    position.value = pos
    const found = nearestTo(pos.latitude, pos.longitude)
    // Keep a branch picked or scanned while we were waiting.
    if (!selectedCode.value) selectedCode.value = found.code
    nearest.value = found
    access.value = 'granted'
    outcome = 'found'
  } catch (err) {
    if ((err as GeolocationPositionError | undefined)?.code === 1) {
      access.value = 'denied'
      outcome = 'denied'
    } else {
      locateFailed.value = true
    }
  } finally {
    detecting.value = false
  }
  $posthog?.capture('checkin_locate', { outcome, on_arrival: locateOnArrival })
}

// On load, find the nearest branch straight away when the visit came from a
// "Check in" tap, or when that won't surprise anyone with a prompt: access
// is granted, or this device has shared its location before. Otherwise the
// empty stamp waits for a tap.
onMounted(async () => {
  access.value = await locationAccess()
  if (prefilled || selectedCode.value || scanned.value) return
  if (access.value === 'denied' || access.value === 'unavailable') return
  if (locateOnArrival || cachedPosition() || access.value === 'granted') void detectNearest()
})

// One checkin_view per branch shown, with the scene it was shown with.
const viewReported = ref(false)
watch([selectedBranch, mode], ([branch, m]) => {
  if (!branch || m !== 'here' || viewReported.value) return
  viewReported.value = true
  $posthog?.capture('checkin_view', { view, branch_code: branch.BranchCode })
}, { immediate: true })

const alreadyVisitedToday = computed(() =>
  selectedBranch.value ? passport.hasVisitedToday(selectedBranch.value.BranchCode) : false
)

const checkInAttempted = ref(false)
const checkInCompleted = ref(false)

const locationStatus = ref<'idle' | 'checking' | 'too-far' | 'timeout' | 'denied' | 'failed'>('idle')
const locationDistKm = ref<number | null>(null)

const isCheckingLocation = computed(() => locationStatus.value === 'checking')

const locationDistFormatted = computed(() =>
  locationDistKm.value === null ? '' : formatDist(locationDistKm.value)
)

watch(selectedCode, () => {
  locationStatus.value = 'idle'
  locationDistKm.value = null
  switchedFrom.value = ''
})

function openPicker() {
  $posthog?.capture('checkin_pick_opened', {
    branch_code: selectedCode.value || null,
    location_access: access.value,
    blocked: locationStatus.value === 'idle' || locationStatus.value === 'checking' ? null : locationStatus.value,
  })
  mode.value = 'pick'
}

function blocked(reason: 'too-far' | 'denied' | 'timeout' | 'failed', km: number | null) {
  $posthog?.capture('checkin_blocked', {
    reason,
    distance_km: km === null ? null : Math.round(km * 100) / 100,
    branch_code: selectedBranch.value?.BranchCode,
    location_access: access.value,
  })
}

async function doCheckIn() {
  if (!selectedBranch.value || alreadyVisitedToday.value) return
  checkInAttempted.value = true

  $posthog?.capture('checkin_started', {
    branch_code: selectedBranch.value.BranchCode,
    branch_name: selectedBranch.value.BranchName,
    district: selectedBranch.value.District ?? '',
    source: scanned.value ? 'qr_scan' : prefilled ? 'branch_page' : 'nav_button',
    location_access: access.value,
    view,
  })

  if (!skipLocationCheck.value) {
    locationStatus.value = 'checking'
    try {
      const { Lat, Long, BranchCode, BranchName } = selectedBranch.value
      const recent = cachedPosition(FENCE_MAX_AGE_MS)
      let km = recent ? haversineKm(recent.latitude, recent.longitude, Lat, Long) : Infinity
      if (km > FENCE_KM) {
        const pos = await freshPosition({ timeout: 5000 })
        position.value = pos
        km = haversineKm(pos.latitude, pos.longitude, Lat, Long)
        // The branch was picked from an older position, a poor fix or a
        // wrong scan. If the fresh fix is inside another branch's fence,
        // switch to that branch so the user can check in where they are.
        const found = nearestTo(pos.latitude, pos.longitude)
        if (km > FENCE_KM && found.code !== BranchCode && found.km <= FENCE_KM) {
          selectedCode.value = found.code
          nearest.value = found
          await nextTick()  // let the selection watcher reset the status first
          switchedFrom.value = BranchName
          locationStatus.value = 'idle'
          return
        }
      }
      if (km > FENCE_KM) {
        locationStatus.value = 'too-far'
        locationDistKm.value = km
        blocked('too-far', km)
        return
      }
    } catch (err) {
      const code = (err as GeolocationPositionError | undefined)?.code
      if (code === 1) {
        locationStatus.value = 'denied'
        access.value = 'denied'
      } else {
        locationStatus.value = code === 3 ? 'timeout' : 'failed'
      }
      blocked(locationStatus.value as 'denied' | 'timeout' | 'failed', null)
      return
    }
  }

  locationStatus.value = 'idle'
  switchedFrom.value = ''
  // Read the selection again after the location check, as the code always has.
  const branch = selectedBranch.value
  if (!branch) return
  const timestamp = passport.checkIn(branch.BranchCode)
  if (timestamp) await completed(branch.BranchCode, timestamp, { source: 'here', view })
}

// "Pick another branch": no location check.
async function stampPicked({ code, day }: { code: string, day: string }) {
  const branch = sortedBranches.find(b => b.BranchCode === code)
  if (!branch) return
  checkInAttempted.value = true
  const ago = daysAgo(day)
  $posthog?.capture('checkin_started', {
    branch_code: branch.BranchCode,
    branch_name: branch.BranchName,
    district: branch.District ?? '',
    source: 'picked',
    location_access: access.value,
  })
  const timestamp = passport.checkIn(branch.BranchCode, '', timestampForDay(day))
  if (!timestamp) return
  $posthog?.capture('checkin_picked', { days_ago: ago, branch_code: branch.BranchCode })
  await completed(branch.BranchCode, timestamp, { source: 'picked', days_ago: ago })
}

async function completed(code: string, timestamp: string, extra: Record<string, unknown>) {
  const branch = sortedBranches.find(b => b.BranchCode === code)!
  const branchVisitCount = passport.checkIns.filter(c => c.branchCode === code).length
  $posthog?.capture('checkin_completed', {
    branch_code: branch.BranchCode,
    branch_name: branch.BranchName,
    district: branch.District ?? '',
    visit_number: branchVisitCount,
    total_visits: passport.checkIns.length,
    ...extra,
  })
  checkInCompleted.value = true
  // The visit's own page is the confirmation. checkedIn (kept in history
  // state, so it survives a reload) shows the "Stamp collected!" extras.
  await navigateTo({ path: visitPath(timestamp), state: { checkedIn: true } })
}

const scannerActive = ref(false)
const scanError = ref('')
function openScanner() {
  $posthog?.capture('qr_scan_attempted')
  scanError.value = ''
  scannerActive.value = true
}

function onQrScanned(branch: string) {
  if (sortedBranches.find(b => b.BranchCode === branch)) {
    selectedCode.value = branch
    scanned.value = true
  } else {
    scanError.value = 'QR code not recognised as a TPL branch.'
  }
}

// Only a real attempt that didn't finish counts as abandoned, with what
// stopped it, so leaving the page after browsing isn't counted.
onUnmounted(() => {
  if (checkInAttempted.value && !checkInCompleted.value && selectedBranch.value) {
    $posthog?.capture('checkin_abandoned', {
      branch_code: selectedBranch.value.BranchCode,
      step: mode.value === 'pick' ? 'pick' : 'form',
      reason: locationStatus.value === 'idle' ? 'unknown' : locationStatus.value,
      location_access: access.value,
    })
  }
})
</script>

<style scoped>
/* The content fills the space under the banner */
.page-centered {
  display: flex;
  flex-direction: column;
}

/* Picking: exactly one screen tall, so only the branch list scrolls */
.page-fit {
  height: 100svh;
  height: 100dvh;
  min-height: 0;
}

.search-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  & svg {
    width: 18px;
    height: 18px;
  }
}

.locate-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px 0;
}

.locate-message {
  max-width: 300px;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-text-mid);
  text-align: center;
}

.locate-btn {
  max-width: 320px;
}

/* The empty stamp: finds the nearest branch */
.stamp-btn {
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s;

  &:not(:disabled):active {
    transform: scale(0.97);
  }

  &:disabled {
    cursor: default;
  }
}

/* At a branch: the scene fills the space under the banner, and the card
   sits at the bottom, over the scene's foot (--scene-cover) */
.here {
  --scene-cover: 72px;
  flex: 1;
  display: flex;
  flex-direction: column;
  /* Full bleed, down to the nav: the scene's ground runs on behind the card */
  margin: -20px -18px -16px;
  padding-bottom: 16px;
}

.here--map {
  background: var(--color-map-land);
}

.here--diary {
  background: var(--color-paper);
}

.here--street {
  background: #d9d2c3;
}

.here-scene {
  flex: 1;
  min-height: 260px;
}

.here-card {
  position: relative;
  margin: calc(-1 * var(--scene-cover)) 12px 0;
  padding: 16px 18px 8px;
  border-radius: 22px;
  background: var(--color-surface);
  box-shadow: 0 16px 40px -12px rgba(0, 28, 113, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.here-stamp {
  margin-top: -84px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  filter: drop-shadow(0 14px 18px rgba(0, 28, 113, 0.28));
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s;

  &:active {
    transform: scale(0.97);
  }
}

.here-name {
  margin-top: 10px;
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-align: center;
  color: var(--color-brand-text);
  font-optical-sizing: auto;
}

.here-status {
  margin-top: 4px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.here-status--here {
  color: var(--color-success);
}

.here-notice {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: var(--color-text-mid);

  & svg {
    flex-shrink: 0;
    stroke: var(--tpl-blue);
  }
}

.here-card .checkin-btn {
  margin-top: 18px;
}

.pick-link {
  margin-top: 4px;
  padding: 10px;
  background: none;
  border: none;
  font: 600 0.9375rem var(--font-body);
  color: var(--color-accent);
  cursor: pointer;
}

.qr-primary-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.qr-btn-primary {
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: var(--shadow-accent);
  transition: background 0.15s, transform 0.1s;

  &:active {
    transform: scale(0.98);
  }
}

.or-divider {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

.checkin-btn {
  width: 100%;
  padding: 16px;
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius);
  font-size: 1.0625rem;
  font-weight: 700;
  font-family: var(--font-body);
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  box-shadow: var(--shadow-accent);

  &:disabled {
    background: var(--color-text-muted);
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:not(:disabled):active {
    transform: scale(0.98);
  }
}

.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.location-error,
.location-note {
  margin-top: 10px;
  font-size: 0.875rem;
  text-align: center;
  padding: 0 8px;
  line-height: 1.5;
}

.location-error {
  color: var(--color-error);
}

.location-note {
  color: var(--color-text-muted);
}

.scan-error {
  font-size: 0.875rem;
  color: var(--color-error);
  text-align: center;
  padding: 0 8px;
}
</style>
