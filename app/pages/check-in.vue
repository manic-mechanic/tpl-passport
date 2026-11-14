<template>
  <main class="page-content">
    <div class="sticky-top">
      <header class="page-header">
        <h1>Check In</h1>
        <p class="sub">
          <template v-if="scanned">Scanned — <strong>{{ selectedBranch?.BranchName }}</strong></template>
          <template v-else-if="prefilled">Scanning at <strong>{{ selectedBranch?.BranchName }}</strong></template>
          <template v-else-if="detecting">Detecting your location…</template>
          <template v-else-if="autoDetected && selectedBranch">
            Nearest branch — <strong>{{ selectedBranch.BranchName
            }}</strong>
          </template>
          <template v-else>Select the branch you're visiting</template>
        </p>
      </header>
    </div>

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
        <label class="field-label" for="note-input">
          Note <span class="optional">optional</span>
        </label>
        <textarea id="note-input" v-model="noteText" class="note-textarea"
                  placeholder="What did you do? What did you read?" rows="3" maxlength="500"
        />
        <p class="char-count">{{ noteText.length }} / 500</p>
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
        You're {{ locationDistFormatted }} away — you need to be within 100 m to check in.
        <NuxtLink :to="`/branch/${selectedBranch.BranchCode}`" class="error-link">View branch page</NuxtLink>
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

<script setup>
import { usePassportStore } from '~/stores/passport'
import { sortedBranches, haversineKm } from '~/composables/useRegion'
import { shouldSkipLocationCheck } from '~/lib/locationCheck'
import { FEATURES } from '~/composables/useFeatureFlags'
import IconVisited from '~/components/icons/IconVisited.vue'
import IconQR from '~/components/icons/IconQR.vue'

function getPosition() {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
  )
}

const { $posthog } = useNuxtApp()
const route = useRoute()
const passport = usePassportStore()

const FALLBACK_BRANCH = 'TRL'

const selectedCode = ref(route.query.branch ?? '')
const prefilled = !!route.query.branch  // static — query string doesn't change after load
const scanned = ref(false)
const autoDetected = ref(false)
const detecting = ref(false)
const showPicker = ref(false)

async function detectNearest() {
  detecting.value = true
  showPicker.value = false
  try {
    const pos = await getPosition()
    const nearest = sortedBranches
      .map(b => ({ ...b, distKm: haversineKm(pos.coords.latitude, pos.coords.longitude, b.Lat, b.Long) }))
      .sort((a, b) => a.distKm - b.distKm)[0]
    selectedCode.value = nearest.BranchCode
  } catch {
    selectedCode.value = FALLBACK_BRANCH
  } finally {
    detecting.value = false
    autoDetected.value = true
  }
}

onMounted(() => {
  if (!prefilled) void detectNearest()
})

const selectedBranch = computed(() =>
  selectedCode.value
    ? sortedBranches.find(b => b.BranchCode === selectedCode.value) ?? null
    : null
)

const alreadyVisitedToday = computed(() =>
  passport.hasVisitedToday(selectedBranch.value?.BranchCode)
)


const noteText = ref('')
const checkInCompleted = ref(false)

const result = ref(null)

const locationStatus = ref('idle') // 'idle' | 'checking' | 'too-far' | 'timeout' | 'denied'
const locationDistKm = ref(null)

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
      const pos = await getPosition()
      const km = haversineKm(
        pos.coords.latitude, pos.coords.longitude,
        selectedBranch.value.Lat, selectedBranch.value.Long
      )
      if (km > 0.1) {
        locationStatus.value = 'too-far'
        locationDistKm.value = km
        return
      }
    } catch (err) {
      locationStatus.value = err?.code === 3 ? 'timeout' : 'denied'
      return
    }
  }

  locationStatus.value = 'idle'
  const timestamp = passport.checkIn(selectedBranch.value.BranchCode, noteText.value.trim())
  if (timestamp) {
    const branchVisitCount = passport.checkIns.filter(c => c.branchCode === selectedBranch.value.BranchCode).length
    $posthog?.capture('checkin_completed', {
      branch_code: selectedBranch.value.BranchCode,
      branch_name: selectedBranch.value.BranchName,
      district: selectedBranch.value.District ?? '',
      note_added: !!noteText.value.trim(),
      visit_number: branchVisitCount,
      total_visits: passport.checkIns.length,
    })
    checkInCompleted.value = true
    result.value = {
      timestamp,
      branchCode: selectedBranch.value.BranchCode,
      branchName: selectedBranch.value.BranchName,
      region: selectedBranch.value.District ?? '',
      wardNo: selectedBranch.value.WardNo,
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

function onQrScanned(branch) {
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
.sticky-top {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 10;
  margin: 0 -18px;
  background: var(--tpl-navy);
}

.page-header {
  padding: 14px 18px 16px;

  & h1 {
    margin-bottom: 4px;
    color: rgba(255, 255, 255, 0.92);
  }
}

.sub {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;

  & strong {
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
  }
}

/* Fields */
.field-group {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
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
  text-align: right;
  margin-top: 4px;
}

/* Photo — used in success sheet */
.stamp-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 4px 0 28px;
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
