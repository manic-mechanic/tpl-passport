<template>
  <main class="page-content" :class="{ 'page-centered': !selectedBranch }">
    <PageBanner title="Check in" />

    <!-- QR scan button — gated behind FEATURES.qrCheckIn (awaiting QR deployment at branches) -->
    <div v-if="FEATURES.qrCheckIn && !selectedBranch" class="qr-primary-area">
      <button class="qr-btn-primary" @click="openScanner">
        <IconQR />
        Scan QR code
      </button>
      <p class="or-divider">or</p>
    </div>

    <!-- A branch: the nearest one, a QR scan, or ?branch= from a branch page -->
    <template v-if="selectedBranch">
      <div class="stamp-area">
        <button class="stamp-btn" :aria-label="`About ${selectedBranch.BranchName}`" @click="branchSheetOpen = true">
          <div :class="{ 'stamp-preview-unvisited': !passport.hasVisited(selectedBranch.BranchCode) }">
            <StampShape :branch-code="selectedBranch.BranchCode" :ward-no="selectedBranch.WardNo" :size="100" />
          </div>
        </button>
        <p class="stamp-name">{{ selectedBranch.BranchName }}</p>
        <p v-if="nearestDistance" class="stamp-distance">{{ nearestDistance }} away</p>
        <button v-if="devPicker" class="change-branch-btn" @click="selectedCode = ''">
          Change branch
        </button>
      </div>

      <div v-if="alreadyVisitedToday" class="visited-notice">
        <IconVisited />
        You've already checked in here today
      </div>

      <div v-else class="field-group">
        <div class="field-label-row">
          <label class="field-label" for="note-input">
            Note <span class="optional">optional</span>
          </label>
          <span class="char-count" aria-live="polite">{{ noteText.length }} / 500</span>
        </div>
        <textarea id="note-input" v-model="noteText" class="note-textarea"
                  placeholder="What did you do? What did you read?" rows="3" maxlength="500"
        />
      </div>

      <div class="cta-area">
        <button class="checkin-btn" :disabled="alreadyVisitedToday || isCheckingLocation" @click="doCheckIn">
          <span v-if="isCheckingLocation" class="btn-spinner" />
          {{ isCheckingLocation ? 'Checking location…' : 'Check in' }}
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
      </div>
    </template>

    <!-- Location blocked: say how to turn it back on -->
    <div v-else-if="access === 'denied' || access === 'unavailable'" class="locate-area">
      <p class="locate-message">
        <template v-if="access === 'unavailable'">Check-in needs your location, and this device can't share it.</template>
        <template v-else>Check-in needs your location. {{ settingsHint }}</template>
      </p>
    </div>

    <!-- No location yet: an empty stamp to fill in -->
    <div v-else class="locate-area">
      <button class="stamp-btn" tabindex="-1" aria-hidden="true" :disabled="detecting" @click="detectNearest">
        <LocateStamp :busy="detecting" />
      </button>
      <p v-if="locateFailed" class="locate-message">Couldn't get your location.</p>
      <button class="checkin-btn locate-btn" :disabled="detecting" @click="detectNearest">
        <span v-if="detecting" class="btn-spinner" />
        {{ detecting ? 'Finding nearest branch…' : locateFailed ? 'Try again' : 'Find nearest branch' }}
      </button>
    </div>

    <!-- Dev builds with the location check off can pick any branch -->
    <CheckInBranchPicker v-if="devPicker && !selectedBranch" class="dev-picker"
                         @select="selectedCode = $event" @locate="detectNearest"
    />

    <p v-if="scanError" class="scan-error">{{ scanError }}</p>
  </main>

  <!-- ── Branch card ───── -->
  <BaseSheet v-model:open="branchSheetOpen" :height="branchSheetHeight">
    <BranchDetail v-if="selectedBranch" :branch="selectedBranch" source="checkin" />
  </BaseSheet>

  <!-- ── Check-in success sheet ───── -->
  <CheckInSuccessSheet v-model:result="result" />

  <!-- ── QR Scanner overlay ────────── -->
  <QrScannerOverlay
    v-if="FEATURES.qrCheckIn"
    v-model:active="scannerActive"
    @scanned="onQrScanned"
    @error="scanError = $event"
  />
</template>

<script setup lang="ts">
import type { CheckInResult } from '~/components/CheckInSuccessSheet.vue'
import { usePassportStore } from '~/stores/passport'
import { sortedBranches, haversineKm, formatDist } from '~/composables/useRegion'
import { shouldSkipLocationCheck } from '~/lib/locationCheck'
import { FEATURES } from '~/composables/useFeatureFlags'
import IconVisited from '~/components/icons/IconVisited.vue'
import IconQR from '~/components/icons/IconQR.vue'
import {
  cachedPosition, freshPosition, getPosition, locationAccess, locationSettingsHint,
  type LocationAccess,
} from '~/lib/geolocation'

// Checking in needs a location within FENCE_KM of the branch. The fence check
// accepts a cached position only when it is this recent and already inside
// the fence; a cached "too far" always gets a fresh fix, so a stale position
// never blocks someone who has just arrived.
const FENCE_MAX_AGE_MS = 2 * 60 * 1000
const FENCE_KM = 0.1

const { $posthog } = useNuxtApp()
const route = useRoute()
const passport = usePassportStore()

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
// Name of the branch the check-in moved away from, when a fresh fix showed
// another branch is nearer.
const switchedFrom = ref('')
const branchSheetOpen = ref(false)
const branchSheetHeight = 'calc(100svh - var(--nav-height) - 60px)'

const settingsHint = import.meta.client
  ? locationSettingsHint(navigator.userAgent, /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  : ''

// Dev builds with the location check switched off: no location needed, so
// offer the branch list instead.
const skipLocationCheck = computed(() => {
  const { public: { isDev, bypassGeofence } } = useRuntimeConfig()
  return shouldSkipLocationCheck({
    isDev: !!isDev,
    bypassGeofence: !!bypassGeofence,
    profileBypass: !!passport.profile.bypassLocationFence,
  })
})
const devPicker = computed(() => skipLocationCheck.value && !prefilled && !scanned.value)

const selectedBranch = computed(() =>
  selectedCode.value
    ? sortedBranches.find(b => b.BranchCode === selectedCode.value) ?? null
    : null
)

const nearestDistance = computed(() =>
  nearest.value && nearest.value.code === selectedCode.value ? formatDist(nearest.value.km) : ''
)

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
  $posthog?.capture('checkin_locate', { outcome })
}

// On load, find the nearest branch straight away when that won't surprise
// anyone with a prompt: access is granted, or this device has shared its
// location before. Otherwise the empty stamp waits for a tap.
onMounted(async () => {
  access.value = await locationAccess()
  if (prefilled || selectedCode.value || scanned.value) return
  if (cachedPosition() || access.value === 'granted') void detectNearest()
})

const alreadyVisitedToday = computed(() =>
  selectedBranch.value ? passport.hasVisitedToday(selectedBranch.value.BranchCode) : false
)

const noteText = ref('')
const checkInAttempted = ref(false)
const checkInCompleted = ref(false)

const result = ref<CheckInResult | null>(null)

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

async function doCheckIn() {
  if (!selectedBranch.value || alreadyVisitedToday.value) return
  checkInAttempted.value = true

  $posthog?.capture('checkin_started', {
    branch_code: selectedBranch.value.BranchCode,
    branch_name: selectedBranch.value.BranchName,
    district: selectedBranch.value.District ?? '',
    source: scanned.value ? 'qr_scan' : prefilled ? 'branch_page' : 'nav_button',
    location_access: access.value,
  })

  if (!skipLocationCheck.value) {
    locationStatus.value = 'checking'
    try {
      const { Lat, Long, BranchCode, BranchName } = selectedBranch.value
      const recent = cachedPosition(FENCE_MAX_AGE_MS)
      let km = recent ? haversineKm(recent.latitude, recent.longitude, Lat, Long) : Infinity
      if (km > FENCE_KM) {
        const pos = await freshPosition({ timeout: 5000 })
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
      return
    }
  }

  locationStatus.value = 'idle'
  switchedFrom.value = ''
  // Read the selection again after the location check, as the code always has.
  const branch = selectedBranch.value
  if (!branch) return
  const timestamp = passport.checkIn(branch.BranchCode, noteText.value.trim())
  if (timestamp) {
    const branchVisitCount = passport.checkIns.filter(c => c.branchCode === branch.BranchCode).length
    $posthog?.capture('checkin_completed', {
      branch_code: branch.BranchCode,
      branch_name: branch.BranchName,
      district: branch.District ?? '',
      note_added: !!noteText.value.trim(),
      visit_number: branchVisitCount,
      total_visits: passport.checkIns.length,
    })
    checkInCompleted.value = true
    result.value = {
      timestamp,
      branchCode: branch.BranchCode,
      branchName: branch.BranchName,
      region: branch.District ?? '',
      wardNo: branch.WardNo,
    }
  }
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
      step: 'form',
      reason: locationStatus.value === 'idle' ? 'unknown' : locationStatus.value,
      location_access: access.value,
    })
  }
})
</script>

<style scoped>
/* No branch yet: centre the prompt in the space under the banner */
.page-centered {
  display: flex;
  flex-direction: column;
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

.dev-picker {
  margin-top: 24px;
}

/* The stamp: opens the branch card, or (empty) finds the nearest branch */
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

.stamp-distance {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

/* Fields */
.field-group {
  margin-bottom: 20px;
}

.field-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.field-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.optional {
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-text-muted);
}

.qr-primary-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
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


  transition: background 0.15s,
  transform 0.1s;

  &:active {
    transform: scale(0.98);
  }
}

.or-divider {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.note-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  resize: none;
  line-height: 1.5;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--tpl-blue);
  }
}

.char-count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

/* Photo — used in success sheet */
.stamp-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  /* Room for the stamp's tilt, so its corner doesn't graze the status line */
  padding-top: 6px;
  margin: 0 0 28px;
}

.stamp-preview-unvisited {
  opacity: 0.24;
  filter: grayscale(1);
}

.stamp-name {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  font-optical-sizing: auto;
}

.change-branch-btn {
  margin-top: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tpl-blue);
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
}

/* Already visited notice */
.visited-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--tpl-blue) 6%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--tpl-blue) 20%, transparent);
  border-radius: var(--radius);
  font-size: 0.875rem;
  color: var(--color-text-mid);
  margin-bottom: 20px;

  & svg {
    flex-shrink: 0;
    stroke: var(--tpl-blue);
  }
}

/* CTA */
.cta-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.checkin-btn {
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

.location-error {
  font-size: 0.875rem;
  color: var(--color-error);
  text-align: center;
  padding: 0 8px;
  line-height: 1.5;
}

.location-note {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 0 8px;
  line-height: 1.5;
}

.scan-error {
  font-size: 0.875rem;
  color: var(--color-error);
  text-align: center;
  padding: 0 8px;
}

.qr-tip {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 0 8px;
  line-height: 1.5;
}

.qr-tip-link {
  color: var(--tpl-blue);
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}


</style>
