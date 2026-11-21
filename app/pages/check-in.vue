<template>
  <main class="page-content">
    <PageBanner title="Check in" />

    <p class="branch-status" aria-live="polite">
      <template v-if="scanned">Scanned at your branch</template>
      <template v-else-if="prefilled">Checking in at</template>
      <template v-else-if="detecting">Detecting your location…</template>
      <template v-else-if="autoDetected && selectedBranch && !showPicker">Nearest branch</template>
      <template v-else-if="locateFailed">Couldn't get your location. Select your branch</template>
      <template v-else-if="!selectedBranch || showPicker">Select the branch you're visiting</template>
      <template v-else>Checking in at</template>
    </p>

    <!-- QR scan button — gated behind FEATURES.qrCheckIn (awaiting QR deployment at branches) -->
    <div v-if="FEATURES.qrCheckIn && !prefilled && !scanned && !selectedBranch" class="qr-primary-area">
      <button class="qr-btn-primary" @click="openScanner">
        <IconQR />
        Scan QR code
      </button>
      <p class="or-divider">or</p>
    </div>

    <div v-if="selectedBranch && !showPicker" class="stamp-area">
      <div :class="{ 'stamp-preview-unvisited': !passport.hasVisited(selectedBranch.BranchCode) }">
        <StampShape :branch-code="selectedBranch.BranchCode" :ward-no="selectedBranch.WardNo" :size="100" />
      </div>
      <p class="stamp-name">{{ selectedBranch.BranchName }}</p>
      <button v-if="scanned" class="change-branch-btn" @click="scanned = false; selectedCode = ''">
        Change branch
      </button>
      <button v-else-if="!prefilled" class="change-branch-btn" @click="showPicker = true">
        Change branch
      </button>
    </div>

    <!-- Branch picker — shown when no branch selected or user wants to change -->
    <CheckInBranchPicker
      v-if="(!selectedBranch || showPicker) && !detecting && !prefilled && !scanned"
      @select="selectedCode = $event"
      @locate="detectNearest"
    />

    <div v-if="selectedBranch && !showPicker && alreadyVisitedToday" class="visited-notice">
      <IconVisited />
      You've already checked in here today
    </div>

    <template v-if="selectedBranch && !showPicker && !alreadyVisitedToday">
      <div class="field-group">
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
    </template>

    <div class="cta-area">
      <button v-if="selectedBranch && !showPicker" class="checkin-btn" :disabled="alreadyVisitedToday || isCheckingLocation"
              @click="doCheckIn"
      >
        <span v-if="isCheckingLocation" class="btn-spinner" />
        {{ isCheckingLocation ? 'Checking location…' : 'Check in' }}
      </button>

      <p v-if="locationStatus === 'too-far'" class="location-error">
        You're {{ locationDistFormatted }} away. Check in from within 100 m of the branch.
        <NuxtLink :to="`/branch/${selectedBranch?.BranchCode}`" class="error-link">View branch page</NuxtLink>
      </p>
      <p v-else-if="locationStatus === 'timeout'" class="location-error">
        Location check timed out. Check your signal and try again.
      </p>
      <p v-else-if="locationStatus === 'denied'" class="location-error">
        Location access was denied. Allow it in your device or browser settings and try again.
      </p>

      <p v-if="scanError" class="scan-error">{{ scanError }}</p>

      <!-- STASHED: QR dev tip — restore when FEATURES.qrCheckIn = true -->
      <!-- <p v-if="FEATURES.qrCheckIn" class="qr-tip">
          Need a QR code to scan? Open
          <a href="https://tpl-passport.vercel.app/qr-print" target="_blank" rel="noopener" class="qr-tip-link">tpl&#8209;passport.vercel.app/qr&#8209;print</a>
          on another device.
        </p> -->
      <!-- END STASHED: QR dev tip -->
    </div>
  </main>

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
import { sortedBranches, haversineKm } from '~/composables/useRegion'
import { shouldSkipLocationCheck } from '~/lib/locationCheck'
import { FEATURES } from '~/composables/useFeatureFlags'
import IconVisited from '~/components/icons/IconVisited.vue'
import IconQR from '~/components/icons/IconQR.vue'
import { cachedPosition, freshPosition, getPosition, locationPermission } from '~/lib/geolocation'

// The geofence check accepts a cached position only when it is this recent
// and already inside the fence. A cached "too far" always gets a fresh fix,
// so a stale position never blocks someone who has just arrived.
const FENCE_MAX_AGE_MS = 2 * 60 * 1000
const FENCE_KM = 0.1

const { $posthog } = useNuxtApp()
const route = useRoute()
const passport = usePassportStore()

const selectedCode = ref(typeof route.query.branch === 'string' ? route.query.branch : '')
const prefilled = !!route.query.branch  // static — query string doesn't change after load
const scanned = ref(false)
const autoDetected = ref(false)
const detecting = ref(false)
const showPicker = ref(false)
const locateFailed = ref(false)

async function detectNearest() {
  detecting.value = true
  locateFailed.value = false
  const wasPicking = showPicker.value
  showPicker.value = false
  try {
    const pos = await getPosition({ timeout: 5000 })
    const nearest = sortedBranches
      .map(b => ({ ...b, distKm: haversineKm(pos.latitude, pos.longitude, b.Lat, b.Long) }))
      .sort((a, b) => a.distKm - b.distKm)[0]
    selectedCode.value = nearest!.BranchCode  // sortedBranches is never empty
    autoDetected.value = true
  } catch {
    // Don't guess a branch and call it "nearest": leave the picker up.
    locateFailed.value = true
    showPicker.value = wasPicking
  } finally {
    detecting.value = false
  }
}

// On load, find the nearest branch only when it won't bring up the location
// prompt: a recent position is cached, or access is already granted. Otherwise
// the branch picker shows, and "Use my location" asks on tap.
onMounted(async () => {
  if (prefilled) return
  const canLocate = !!cachedPosition() || await locationPermission() === 'granted'
  // The picker is usable while the permission check runs; keep a branch the
  // user picked or scanned in the meantime.
  if (canLocate && !selectedCode.value && !scanned.value) void detectNearest()
})

const selectedBranch = computed(() =>
  selectedCode.value
    ? sortedBranches.find(b => b.BranchCode === selectedCode.value) ?? null
    : null
)

const alreadyVisitedToday = computed(() =>
  selectedBranch.value ? passport.hasVisitedToday(selectedBranch.value.BranchCode) : false
)


const noteText = ref('')
const checkInCompleted = ref(false)

const result = ref<CheckInResult | null>(null)

const locationStatus = ref<'idle' | 'checking' | 'too-far' | 'timeout' | 'denied'>('idle')
const locationDistKm = ref<number | null>(null)

const isCheckingLocation = computed(() => locationStatus.value === 'checking')

const locationDistFormatted = computed(() => {
  if (locationDistKm.value === null) return ''
  return locationDistKm.value >= 1
    ? `${locationDistKm.value.toFixed(1)} km`
    : `${Math.round(locationDistKm.value * 1000)} m`
})

watch(selectedCode, () => {
  locationStatus.value = 'idle'
  locationDistKm.value = null
  showPicker.value = false
})

async function doCheckIn() {
  if (!selectedBranch.value || alreadyVisitedToday.value) return

  $posthog?.capture('checkin_started', {
    branch_code: selectedBranch.value.BranchCode,
    branch_name: selectedBranch.value.BranchName,
    district: selectedBranch.value.District ?? '',
    source: scanned.value ? 'qr_scan' : prefilled ? 'branch_page' : 'nav_button',
  })

  const { public: { isDev, bypassGeofence } } = useRuntimeConfig()
  const skipLocationCheck = shouldSkipLocationCheck({
    isDev: !!isDev,
    bypassGeofence: !!bypassGeofence,
    profileBypass: !!passport.profile.bypassLocationFence,
  })
  if (!skipLocationCheck) {
    locationStatus.value = 'checking'
    try {
      const { Lat, Long } = selectedBranch.value
      const recent = cachedPosition(FENCE_MAX_AGE_MS)
      let km = recent ? haversineKm(recent.latitude, recent.longitude, Lat, Long) : Infinity
      if (km > FENCE_KM) {
        const pos = await freshPosition({ timeout: 5000 })
        km = haversineKm(pos.latitude, pos.longitude, Lat, Long)
      }
      if (km > FENCE_KM) {
        locationStatus.value = 'too-far'
        locationDistKm.value = km
        return
      }
    } catch (err) {
      locationStatus.value = (err as GeolocationPositionError | undefined)?.code === 3 ? 'timeout' : 'denied'
      return
    }
  }

  locationStatus.value = 'idle'
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

onUnmounted(() => {
  if (!checkInCompleted.value && selectedBranch.value) {
    $posthog?.capture('checkin_abandoned', {
      branch_code: selectedBranch.value.BranchCode,
      step: 'form',
    })
  }
})
</script>

<style scoped>
/* Status line between the banner and the stamp (or branch picker) */
.branch-status {
  margin: 4px 0 12px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
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

.error-link {
  display: block;
  margin-top: 8px;
  color: var(--tpl-blue);
  font-weight: 600;
  text-decoration: none;
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
