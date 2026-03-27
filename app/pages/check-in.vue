<template>
  <main class="page-content">

    <div v-if="result" class="success-view">
      <div class="success-hero">
        <div class="success-stamp-wrap">
          <StampShape class="success-stamp" :branchCode="result.branchCode" :wardNo="result.wardNo" :size="110" />
          <div class="success-check-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" width="14" height="14">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
        <p class="success-label">Stamp collected!</p>
        <p class="success-branch">{{ result.branchName }}</p>
        <p class="success-region">{{ result.region }}</p>
        <NuxtLink :to="`/branch/${result.branchCode}`" class="btn-primary">View branch</NuxtLink>
        <button v-if="photoBlob" class="save-photo-btn" @click="savePhotoToDevice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="15" height="15">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Save photo
        </button>
      </div>

      <div v-if="nearbySuccessBranches.length" class="success-nearby">
        <p class="success-nearby-heading">Also nearby</p>
        <div class="nearby-list">
          <NuxtLink
            v-for="nb in nearbySuccessBranches"
            :key="nb.BranchCode"
            :to="`/branch/${nb.BranchCode}`"
            class="nearby-row"
          >
            <StampShape :branchCode="nb.BranchCode" :wardNo="nb.WardNo" :size="36" />
            <div class="nearby-info">
              <span class="nearby-name">{{ nb.BranchName }}</span>
              <span class="nearby-dist">{{ formatDist(nb.distKm) }} away · {{ nb.District }}</span>
            </div>
            <svg class="nearby-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </NuxtLink>
        </div>
      </div>
    </div>

    <template v-else>
    <header class="page-header">
        <h1>Check In</h1>
        <p class="sub">
          <template v-if="scanned">Scanned — <strong>{{ selectedBranch?.BranchName }}</strong></template>
          <template v-else-if="prefilled">Scanning at <strong>{{ selectedBranch?.BranchName }}</strong></template>
          <template v-else>Select the branch you're visiting</template>
        </p>
      </header>

      <!-- QR scan button — gated behind FEATURES.qrCheckIn (awaiting QR deployment at branches) -->
      <div v-if="FEATURES.qrCheckIn && !prefilled && !scanned && !selectedBranch" class="qr-primary-area">
        <button class="qr-btn-primary" @click="openScanner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="18" height="18">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            <rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/>
          </svg>
          Scan QR code
        </button>
        <p class="or-divider">or</p>
      </div>

      <div v-if="!prefilled && !scanned" class="field-group">
        <label class="field-label" for="branch-search">Branch</label>
        <BranchCombobox id="branch-search" v-model="selectedCode" />
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        You've already checked in here today
      </div>

      <template v-if="selectedBranch && !alreadyVisitedToday">
        <div class="field-group">
          <label class="field-label" for="note-input">
            Note <span class="optional">optional</span>
          </label>
          <textarea
            id="note-input"
            v-model="noteText"
            class="note-textarea"
            placeholder="What did you do? What did you read?"
            rows="3"
            maxlength="500"
          />
          <p class="char-count">{{ noteText.length }} / 500</p>
        </div>

        <div class="field-group">
          <label class="field-label">
            Photo <span class="optional">optional</span>
          </label>
          <div class="photo-area">
            <img v-if="photoPreview" :src="photoPreview" class="photo-preview" alt="Check-in photo" />
            <label class="photo-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="16" height="16">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              {{ photoPreview ? 'Change photo' : 'Add photo' }}
              <input
                type="file"
                accept="image/*"
                class="photo-input"
                @change="onPhotoCapture"
              />
            </label>
          </div>
        </div>
      </template>

      <div class="cta-area">
        <button
          v-if="selectedBranch"
          class="checkin-btn"
          :disabled="alreadyVisitedToday || isCheckingLocation"
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

    </template>
  </main>

  <!-- ── QR Scanner overlay ────────── -->
  <Teleport to="body">
    <div v-if="FEATURES.qrCheckIn && scannerActive" class="scanner-overlay">
      <video ref="videoEl" class="scanner-video" playsinline autoplay muted />
      <!-- Hidden canvas used to capture frames for jsQR -->
      <canvas ref="scanCanvas" class="scanner-canvas" />

      <!-- Viewfinder corners (decorative) -->
      <div class="scanner-frame">
        <div class="frame-corner frame-corner--tl" />
        <div class="frame-corner frame-corner--tr" />
        <div class="frame-corner frame-corner--bl" />
        <div class="frame-corner frame-corner--br" />
      </div>

      <p class="scanner-hint">Point at a branch QR code</p>

      <button class="scanner-close" @click="closeScanner" aria-label="Close scanner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import jsQR from 'jsqr'
import { usePassportStore } from '~/stores/passport'
import { sortedBranches, haversineKm, formatDist } from '~/composables/useRegion'
import { savePhoto } from '~/composables/usePhotoStore'
import { FEATURES } from '~/composables/useFeatureFlags'

const route   = useRoute()
const passport = usePassportStore()

const selectedCode = ref(route.query.branch ?? '')
const prefilled    = !!route.query.branch  // static — query string doesn't change after load
const scanned      = ref(false)



const selectedBranch = computed(() =>
  selectedCode.value
    ? sortedBranches.find(b => b.BranchCode ===selectedCode.value) ?? null
    : null
)

const alreadyVisitedToday = computed(() =>
  passport.hasVisitedToday(selectedBranch.value?.BranchCode)
)


const noteText     = ref('')
const photoPreview = ref(null)  // object URL — revoked on unmount / photo change
const photoBlob    = ref(null)  // compressed JPEG blob, kept for save-to-device after check-in

// Resize to ≤ 1200 px wide and compress to JPEG — keeps IndexedDB small
// and matches what we'll need for Supabase Storage uploads later.
function compressPhoto(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale   = Math.min(1, maxWidth / img.width)
      const canvas  = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
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
  photoBlob.value    = blob
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
    const a  = document.createElement('a')
    a.href   = URL.createObjectURL(photoBlob.value)
    a.download = 'tpl-checkin.jpg'
    a.click()
    URL.revokeObjectURL(a.href)
  }
}

const result         = ref(null)
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

  const config = useRuntimeConfig()
  if (!passport.profile.bypassLocationFence && !config.public.bypassGeofence) {
    locationStatus.value = 'checking'
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      )
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
    }
    result.value = {
      branchCode: selectedBranch.value.BranchCode,
      branchName: selectedBranch.value.BranchName,
      region:     selectedBranch.value.District ?? '',
      wardNo:     selectedBranch.value.WardNo,
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
const scanError     = ref('')
const videoEl       = ref(null)
const scanCanvas    = ref(null)
let stream = null
let rafId  = null
let ctx    = null  // canvas 2d context — hoisted so it's not re-fetched every frame

async function openScanner() {
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
    scanCanvas.value.width  = videoEl.value.videoWidth
    scanCanvas.value.height = videoEl.value.videoHeight
    ctx = scanCanvas.value.getContext('2d')
    rafId = requestAnimationFrame(scanLoop)
  } catch {
    scanError.value = 'Camera access denied — check your browser settings.'
    scannerActive.value = false
  }
}

function scanLoop() {
  const video  = videoEl.value
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
    const url    = new URL(data)
    const branch = url.searchParams.get('branch')
    if (branch && sortedBranches.find(b => b.BranchCode ===branch)) {
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
  if (rafId)  { cancelAnimationFrame(rafId); rafId = null }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
  ctx = null
}

onUnmounted(() => {
  closeScanner()
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
})
</script>

<style scoped>
.page-header {
  padding: 20px 0 24px;
}

.page-header h1 { margin-bottom: 6px; }

.sub {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.sub strong { color: var(--color-text-mid); font-weight: 600; }

/* Fields */
.field-group {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  font-size: 0.8rem;
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
  gap: 9px;
  box-shadow: 0 4px 14px rgba(0, 95, 192, 0.32);
  transition: background 0.15s, transform 0.1s;
}

.qr-btn-primary:active { transform: scale(0.98); }

.or-divider {
  font-size: 0.78rem;
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
  box-sizing: border-box;
}

.note-textarea:focus { border-color: var(--tpl-blue); }

.char-count {
  font-size: 0.72rem;
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
  gap: 7px;
  padding: 10px 16px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-mid);
  background: var(--color-surface);
  cursor: pointer;
}

.photo-input { display: none; }

/* Stamp preview */
.stamp-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 4px 0 28px;
}

.stamp-lg {
  width: 100px;
  height: 100px;
  border: 3px solid currentColor;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stamp-lg-ring {
  position: absolute;
  inset: 7px;
  border: 1.5px solid currentColor;
  opacity: 0.35;
}

.stamp-lg-code {
  font-family: var(--font-stamp);
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
}

.stamp-name {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  font-optical-sizing: auto;
}

.stamp-region {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

.change-branch-btn {
  margin-top: 4px;
  font-size: 0.8rem;
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
}

.visited-notice svg { flex-shrink: 0; stroke: var(--tpl-blue); }

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
  box-shadow: 0 4px 14px rgba(0, 95, 192, 0.32);
}

.checkin-btn:disabled {
  background: var(--color-text-muted);
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.6;
}

.checkin-btn:not(:disabled):active { transform: scale(0.98); }

.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.location-error {
  font-size: 0.82rem;
  color: #c0392b;
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
  font-size: 0.8rem;
  color: #c0392b;
  text-align: center;
  padding: 0 8px;
}

.qr-tip {
  font-size: 0.78rem;
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
}

.qr-tip-link:hover { text-decoration: underline; }

/* ── Success state ─────────────────────────── */
.success-view {
  padding: min(120px, 18vh) 0 24px;
}

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

.success-check-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #27ae60;
  border: 2px solid var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: check-pop 0.25s cubic-bezier(0.34, 1.6, 0.64, 1) 0.3s both;
}

@keyframes stamp-in {
  from { transform: scale(1.4) rotate(-8deg); opacity: 0; }
  to   { transform: scale(1) rotate(0deg);    opacity: 1; }
}

@keyframes check-pop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
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
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.btn-primary {
  display: block;
  padding: 14px 28px;
  background: var(--tpl-navy);
  color: white;
  border-radius: var(--radius);
  font-size: 0.95rem;
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
  padding: 9px 20px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-mid);
  background: var(--color-surface);
  cursor: pointer;
}

.success-nearby {
  width: 100%;
}

.success-nearby-heading {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin-bottom: 10px;
}

.nearby-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

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

.nearby-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nearby-name {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
}

.nearby-dist {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.nearby-arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: var(--color-text-muted);
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
.scanner-canvas { display: none; }

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
}

.frame-corner--tl { top: 0;    left: 0;  border-top-width: 3px;    border-left-width: 3px;  border-top-left-radius: 4px;     }
.frame-corner--tr { top: 0;    right: 0; border-top-width: 3px;    border-right-width: 3px; border-top-right-radius: 4px;    }
.frame-corner--bl { bottom: 0; left: 0;  border-bottom-width: 3px; border-left-width: 3px;  border-bottom-left-radius: 4px;  }
.frame-corner--br { bottom: 0; right: 0; border-bottom-width: 3px; border-right-width: 3px; border-bottom-right-radius: 4px; }

.scanner-hint {
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  font-family: var(--font-body);
  margin-top: 24px;
  text-align: center;
}

.scanner-close {
  position: absolute;
  top: max(20px, env(safe-area-inset-top));
  right: 20px;
  z-index: 2;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>
