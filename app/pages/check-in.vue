<template>
  <main class="page-content">

    <header class="page-header">
      <h1>Check In</h1>
      <p class="sub">
        <template v-if="scanned">Scanned — <strong>{{ selectedBranch?.BranchName }}</strong></template>
        <template v-else-if="prefilled">Scanning at <strong>{{ selectedBranch?.BranchName }}</strong></template>
        <template v-else-if="detecting">Detecting your location…</template>
        <template v-else-if="autoDetected && selectedBranch">Nearest branch — <strong>{{ selectedBranch.BranchName
            }}</strong></template>
        <template v-else>Select the branch you're visiting</template>
      </p>
    </header>

    <!-- QR scan button — gated behind FEATURES.qrCheckIn (awaiting QR deployment at branches) -->
    <div v-if="FEATURES.qrCheckIn && !prefilled && !scanned && !selectedBranch" class="qr-primary-area">
      <button class="qr-btn-primary" @click="openScanner">
        <IconQR />
        Scan QR code
      </button>
      <p class="or-divider">or</p>
    </div>

    <div v-if="!prefilled && !scanned && !detecting" class="not-here">
      Not at this branch? <NuxtLink to="/explore" class="not-here-link">Find a branch →</NuxtLink>
    </div>

    <div v-if="selectedBranch" class="stamp-area">
      <StampShape :branchCode="selectedBranch.BranchCode" :wardNo="selectedBranch.WardNo" :size="100" />
      <p class="stamp-name">{{ selectedBranch.BranchName }}</p>
      <p class="stamp-region">{{ selectedBranch.District }}</p>
      <button v-if="scanned" class="change-branch-btn" @click="scanned = false; selectedCode = ''">
        Change branch
      </button>
    </div>

    <div v-if="selectedBranch && alreadyVisitedToday" class="visited-notice">
      <IconVisited />
      You've already checked in here today
    </div>

    <template v-if="selectedBranch && !alreadyVisitedToday">
      <div class="field-group">
        <label class="field-label" for="note-input">
          Note <span class="optional">optional</span>
        </label>
        <textarea id="note-input" v-model="noteText" class="note-textarea"
          placeholder="What did you do? What did you read?" rows="3" maxlength="500" />
        <p class="char-count">{{ noteText.length }} / 500</p>
      </div>

      <div class="field-group">
        <label class="field-label">
          Photo <span class="optional">optional</span>
        </label>
        <div class="photo-area">
          <img v-if="photoPreview" :src="photoPreview" class="photo-preview" alt="Check-in photo" />
          <label class="photo-btn">

            <IconPhoto />
            {{ photoPreview ? 'Change photo' : 'Add photo' }}
            <input type="file" accept="image/*" class="photo-input" @change="onPhotoCapture" />
          </label>
        </div>
      </div>
    </template>

    <div class="cta-area">
      <button v-if="selectedBranch" class="checkin-btn" :disabled="alreadyVisitedToday || isCheckingLocation"
        @click="doCheckIn">
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
  <BaseSheet v-model:open="successSheetOpen" :height="successSheetHeight">
    <div v-if="result">
      <div class="success-hero">
        <div class="success-stamp-wrap">
          <StampShape :branchCode="result.branchCode" :wardNo="result.wardNo" :size="110" />
          <div class="success-check-badge">
            <IconSuccessCheck />
          </div>
        </div>
        <p class="success-label">Stamp collected!</p>
        <p class="success-branch">{{ result.branchName }}</p>
        <p class="success-region">{{ result.region }}</p>
        <NuxtLink :to="`/branch/${result.branchCode}`" class="btn-primary">View branch</NuxtLink>
        <button v-if="photoBlob" class="save-photo-btn" @click="savePhotoToDevice">
          <IconSave />
          Save photo
        </button>
      </div>

      <div v-if="showSignInNudge" class="signin-nudge">
        <p class="signin-nudge__text">Save your progress — access your passport on any device</p>
        <NuxtLink to="/login" class="signin-nudge__link" @click="successSheetOpen = false">Sign in →</NuxtLink>
      </div>

      <div v-if="nearbySuccessBranches.length" class="success-nearby">
        <p class="success-nearby-heading">Also nearby</p>
        <NearbyBranchList :branches="nearbySuccessBranches" :showDistrict="true" />
      </div>
    </div>
  </BaseSheet>

  <!-- ── QR Scanner overlay ────────── -->
  <Teleport to="body">
    <div v-if="FEATURES.qrCheckIn && scannerActive" class="scanner-overlay">
      <video ref="videoEl" class="scanner-video" playsinline autoplay muted />
      <!-- Hidden canvas used to capture frames for jsQR -->
      <canvas ref="scanCanvas" class="scanner-canvas" />

      <!-- Viewfinder corners (decorative) -->
      <div class="scanner-frame">
        <div class="frame-corner frame-corner-tl" />
        <div class="frame-corner frame-corner-tr" />
        <div class="frame-corner frame-corner-bl" />
        <div class="frame-corner frame-corner-br" />
      </div>

      <p class="scanner-hint">Point at a branch QR code</p>

      <button class="scanner-close" @click="closeScanner" aria-label="Close scanner">
        <IconClose />
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import jsQR from 'jsqr'
import { usePassportStore } from '~/stores/passport'
import { sortedBranches, haversineKm, formatDist } from '~/composables/useRegion'
import { savePhoto } from '~/composables/usePhotoStore'

const AUTH_BASE = 'https://auth.librarypassport.ca'

async function uploadPhoto(timestamp, blob) {
  try {
    const res = await fetch(`${AUTH_BASE}/api/upload/photo?ext=jpg`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
    })
    if (!res.ok) return
    const { publicUrl } = await res.json()
    if (publicUrl) passport.markCheckInHasPhoto(timestamp, publicUrl)
  } catch { /* fire-and-forget */ }
}
import { FEATURES } from '~/composables/useFeatureFlags'
import { authClient } from '~/lib/auth-client'
import IconPhoto from '~/components/icons/IconPhoto.vue'
import IconVisited from '~/components/icons/IconVisited.vue'
import IconQR from '~/components/icons/IconQR.vue'
import IconSave from '~/components/icons/IconSave.vue'
import IconSuccessCheck from '~/components/icons/IconSuccessCheck.vue'
import IconClose from '~/components/icons/IconClose.vue'

const isSignedIn = ref(false)

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

onMounted(async () => {
  const [{ data: session }] = await Promise.all([
    authClient.getSession(),
    (async () => {
      if (prefilled) return
      detecting.value = true
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
    })(),
  ])
  isSignedIn.value = !!session
})

const showSignInNudge = computed(() =>
  !isSignedIn.value && passport.checkIns.length === 1
)



const selectedBranch = computed(() =>
  selectedCode.value
    ? sortedBranches.find(b => b.BranchCode === selectedCode.value) ?? null
    : null
)

const alreadyVisitedToday = computed(() =>
  passport.hasVisitedToday(selectedBranch.value?.BranchCode)
)


const noteText = ref('')
const photoPreview = ref(null)  // object URL — revoked on unmount / photo change
const photoBlob = ref(null)  // compressed JPEG blob, kept for save-to-device after check-in

// Resize to ≤ 1200 px wide and compress to JPEG — keeps IndexedDB small
// and matches what we'll need for Supabase Storage uploads later.
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

async function onPhotoCapture(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  const blob = await compressPhoto(file)
  photoBlob.value = blob
  photoPreview.value = URL.createObjectURL(blob)
}

// Triggers native share sheet (iOS/Android) so user can "Save Image",
// with a direct download fallback for desktop browsers.
async function savePhotoToDevice() {
  if (!photoBlob.value) return
  const file = new File([photoBlob.value], 'tpl-checkin.jpg', { type: 'image/jpeg' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] })
  } else {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(photoBlob.value)
    a.download = 'tpl-checkin.jpg'
    a.click()
    URL.revokeObjectURL(a.href)
  }
}

const checkInCompleted = ref(false)

const successSheetOpen = ref(false)
const successSheetHeight = 'calc(100dvh - var(--nav-height) - 60px)'

const result = ref(null)
watch(result, val => { if (val) successSheetOpen.value = true })
watch(successSheetOpen, open => { if (!open) result.value = null })
const locationStatus = ref('idle') // 'idle' | 'checking' | 'too-far' | 'timeout' | 'denied'
const locationDistKm = ref(null)

const isCheckingLocation = computed(() => locationStatus.value === 'checking')

const locationDistFormatted = computed(() => {
  if (locationDistKm.value === null) return ''
  return locationDistKm.value >= 1
    ? `${locationDistKm.value.toFixed(1)} km`
    : `${Math.round(locationDistKm.value * 1000)} m`
})

watch(selectedCode, () => { locationStatus.value = 'idle'; locationDistKm.value = null })

async function doCheckIn() {
  if (!selectedBranch.value || alreadyVisitedToday.value) return

  $posthog?.capture('checkin_started', {
    branch_code: selectedBranch.value.BranchCode,
    branch_name: selectedBranch.value.BranchName,
    district: selectedBranch.value.District ?? '',
    source: scanned.value ? 'qr_scan' : prefilled ? 'branch_page' : 'nav_button',
  })

  const config = useRuntimeConfig()
  if (!passport.profile.bypassLocationFence && !config.public.bypassGeofence) {
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
    if (photoBlob.value) {
      savePhoto(timestamp, photoBlob.value)
      passport.markCheckInHasPhoto(timestamp)
      if (isSignedIn.value) uploadPhoto(timestamp, photoBlob.value)
    }
    const branchVisitCount = passport.checkIns.filter(c => c.branchCode === selectedBranch.value.BranchCode).length
    $posthog?.capture('checkin_completed', {
      branch_code: selectedBranch.value.BranchCode,
      branch_name: selectedBranch.value.BranchName,
      district: selectedBranch.value.District ?? '',
      photo_taken: !!photoBlob.value,
      note_added: !!noteText.value.trim(),
      visit_number: branchVisitCount,
      total_visits: passport.checkIns.length,
    })
    checkInCompleted.value = true
    result.value = {
      branchCode: selectedBranch.value.BranchCode,
      branchName: selectedBranch.value.BranchName,
      region: selectedBranch.value.District ?? '',
      wardNo: selectedBranch.value.WardNo,
    }
  }
}

const nearbySuccessBranches = computed(() => {
  if (!result.value) return []
  const current = sortedBranches.find(b => b.BranchCode === result.value.branchCode)
  if (!current?.Lat || !current?.Long) return []
  return sortedBranches
    .filter(b => b.BranchCode !== result.value.branchCode)
    .map(b => ({ ...b, distKm: haversineKm(current.Lat, current.Long, b.Lat, b.Long) }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 2)
})

const scannerActive = ref(false)
const scanError = ref('')
const videoEl = ref(null)
const scanCanvas = ref(null)
let stream = null
let rafId = null
let ctx = null  // canvas 2d context — hoisted so it's not re-fetched every frame

async function openScanner() {
  $posthog?.capture('qr_scan_attempted')
  scanError.value = ''
  scannerActive.value = true
  await nextTick()
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    videoEl.value.srcObject = stream
    await videoEl.value.play()
    // Set canvas dimensions once — videoWidth/Height are fixed for a given camera stream
    scanCanvas.value.width = videoEl.value.videoWidth
    scanCanvas.value.height = videoEl.value.videoHeight
    ctx = scanCanvas.value.getContext('2d')
    rafId = requestAnimationFrame(scanLoop)
  } catch {
    scanError.value = 'Camera access denied — check your browser settings.'
    scannerActive.value = false
  }
}

function scanLoop() {
  const video = videoEl.value
  const canvas = scanCanvas.value
  if (!video || !canvas || !scannerActive.value) return

  if (video.readyState < video.HAVE_ENOUGH_DATA) {
    rafId = requestAnimationFrame(scanLoop)
    return
  }

  ctx.drawImage(video, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imageData.data, imageData.width, imageData.height)

  if (code) {
    handleQrResult(code.data)
    return
  }

  rafId = requestAnimationFrame(scanLoop)
}

function handleQrResult(data) {
  closeScanner()
  try {
    const url = new URL(data)
    const branch = url.searchParams.get('branch')
    if (branch && sortedBranches.find(b => b.BranchCode === branch)) {
      selectedCode.value = branch
      scanned.value = true
    } else {
      scanError.value = 'QR code not recognised as a TPL branch.'
    }
  } catch {
    scanError.value = 'QR code not recognised as a TPL branch.'
  }
}

function closeScanner() {
  scannerActive.value = false
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
  ctx = null
}

onUnmounted(() => {
  closeScanner()
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  if (!checkInCompleted.value && selectedBranch.value) {
    $posthog?.capture('checkin_abandoned', {
      branch_code: selectedBranch.value.BranchCode,
      step: 'form',
    })
  }
})
</script>

<style scoped>
.page-header {
  padding: 20px 0 24px;

  & h1 {
    margin-bottom: 6px;
  }
}

.sub {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;

  & strong {
    color: var(--color-text-mid);
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

.not-here {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 20px;
}

.not-here-link {
  color: var(--tpl-blue);
  font-weight: 600;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

/* QR primary area */
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
  gap: 8px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--tpl-blue) 32%, transparent);

  @media (prefers-color-scheme: dark) {
    & {
      box-shadow: none;
    }
  }

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

/* Photo */
.photo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.photo-preview {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.photo-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-mid);
  background: var(--color-surface);
  cursor: pointer;
}

.photo-input {
  display: none;
}

/* Stamp preview */
.stamp-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 4px 0 28px;
}

.stamp-name {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  font-optical-sizing: auto;
}

.stamp-region {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 600;
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
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-body);
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--tpl-blue) 32%, transparent);

  @media (prefers-color-scheme: dark) {
    & {
      box-shadow: none;
    }
  }

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

/* ── Success sheet content ── */
.success-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  margin-bottom: 32px;
}

.success-stamp-wrap {
  position: relative;
  margin-bottom: 12px;
  animation: stamp-in 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

/* Absolute overlay badge on top of stamp — position relative to stamp bounds */
.success-check-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-success);
  border: 2px solid var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: check-pop 0.25s cubic-bezier(0.34, 1.6, 0.64, 1) 0.3s both;
}

@keyframes stamp-in {
  from {
    transform: scale(1.4) rotate(-8deg);
    opacity: 0;
  }

  to {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

@keyframes check-pop {
  from {
    transform: scale(0);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

.success-label {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  font-optical-sizing: auto;
}

.success-branch {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-mid);
}

.success-region {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.btn-primary {
  display: block;
  padding: 14px 28px;
  background: var(--tpl-navy);
  color: white;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-body);
  text-align: center;
  text-decoration: none;
  min-width: 200px;
}

.save-photo-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-mid);
  background: var(--color-surface);
  cursor: pointer;
}

.signin-nudge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 24px;
  background: color-mix(in srgb, var(--tpl-blue) 6%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--tpl-blue) 20%, transparent);
  border-radius: var(--radius);
  width: 100%;
}

.signin-nudge__text {
  font-size: 0.875rem;
  color: var(--color-text-mid);
  line-height: 1.4;
}

.signin-nudge__link {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--tpl-blue);
  white-space: nowrap;
  flex-shrink: 0;
}

.success-nearby {
  width: 100%;
}

.success-nearby-heading {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin-bottom: 10px;
}

/* ── QR Scanner overlay ─────────────────────── */
.scanner-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.scanner-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Hidden — used only to capture frames for jsQR */
.scanner-canvas {
  display: none;
}

/* Viewfinder frame */
.scanner-frame {
  position: relative;
  z-index: 1;
  width: 220px;
  height: 220px;
}

.frame-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: #fff;
  border-style: solid;
  border-width: 0;

  &.frame-corner-tl {
    top: 0;
    left: 0;
    border-top-width: 3px;
    border-left-width: 3px;
    border-top-left-radius: 4px;
  }

  &.frame-corner-tr {
    top: 0;
    right: 0;
    border-top-width: 3px;
    border-right-width: 3px;
    border-top-right-radius: 4px;
  }

  &.frame-corner-bl {
    bottom: 0;
    left: 0;
    border-bottom-width: 3px;
    border-left-width: 3px;
    border-bottom-left-radius: 4px;
  }

  &.frame-corner-br {
    bottom: 0;
    right: 0;
    border-bottom-width: 3px;
    border-right-width: 3px;
    border-bottom-right-radius: 4px;
  }
}

.scanner-hint {
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  font-family: var(--font-body);
  margin-top: 24px;
  text-align: center;
}

.scanner-close {
  position: absolute;
  top: max(20px, env(safe-area-inset-top));
  right: 20px;
  z-index: 2;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

:global([data-theme="dark"]) .qr-btn-primary,
:global([data-theme="dark"]) .checkin-btn {
  box-shadow: none;
}
</style>
