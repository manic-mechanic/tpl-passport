<template>
  <main class="page-content">

    <!-- ── Success state ─────────────────────── -->
    <template v-if="result">
      <div class="success-view">
        <div class="success-stamp" :style="successStampStyle">
          <div class="success-ring" :style="{ borderRadius: successStampStyle.borderRadius }" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="32" height="32">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p class="success-label">Stamp collected!</p>
        <p class="success-branch">{{ result.branchName }}</p>
        <p class="success-region">{{ result.region }}</p>
        <div class="success-actions">
          <NuxtLink :to="`/branch/${result.branchCode}`" class="btn-outline">View branch →</NuxtLink>
          <button class="btn-ghost" @click="reset">Check in somewhere else</button>
        </div>
      </div>
    </template>

    <!-- ── Check-in form ─────────────────────── -->
    <template v-else>
      <header class="page-header">
        <h1>Check In</h1>
        <p class="sub">
          <template v-if="scanned">Scanned — <strong>{{ selectedBranch?.BranchName }}</strong></template>
          <template v-else-if="prefilled">Scanning at <strong>{{ selectedBranch?.BranchName }}</strong></template>
          <template v-else>Select the branch you're visiting</template>
        </p>
      </header>

      <!-- QR scan — primary action, shown until a branch is selected -->
      <div v-if="!prefilled && !scanned && !selectedBranch" class="qr-primary-area">
        <button class="qr-btn-primary" @click="openScanner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="18" height="18">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            <rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/>
          </svg>
          Scan QR code
        </button>
        <p class="or-divider">or</p>
      </div>

      <!-- Branch combo box — manual fallback, hidden when pre-filled via URL or QR scan -->
      <div v-if="!prefilled && !scanned" class="field-group">
        <label class="field-label" for="branch-search">Branch</label>
        <div class="combo-wrap">
          <input
            id="branch-search"
            v-model="searchText"
            class="branch-combo"
            type="text"
            autocomplete="off"
            placeholder="Search branches…"
            @focus="showDropdown = true"
            @blur="onComboBlur"
            @input="selectedCode = ''"
          />
          <ul v-if="showDropdown && filteredBranches.length" class="combo-dropdown">
            <li
              v-for="b in filteredBranches"
              :key="b.BranchCode"
              class="combo-option"
              @mousedown.prevent="selectBranch(b)"
            >
              {{ b.BranchName }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Stamp preview -->
      <div v-if="selectedBranch" class="stamp-area">
        <div class="stamp-lg" :style="previewStampStyle">
          <div class="stamp-lg-ring" :style="{ borderRadius: previewStampStyle.borderRadius }" />
          <span class="stamp-lg-code">{{ selectedBranch.BranchCode }}</span>
        </div>
        <p class="stamp-name">{{ selectedBranch.BranchName }}</p>
        <p class="stamp-region">{{ selectedRegion }}</p>
        <button v-if="scanned" class="change-branch-btn" @click="scanned = false; selectedCode = ''">
          Change branch
        </button>
      </div>

      <!-- Already visited today -->
      <div v-if="selectedBranch && alreadyVisitedToday" class="visited-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        You've already checked in here today
      </div>

      <!-- Note + photo (only when branch selected + not already visited) -->
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
                capture="environment"
                class="photo-input"
                @change="onPhotoCapture"
              />
            </label>
          </div>
        </div>
      </template>

      <!-- CTA -->
      <div class="cta-area">
        <button
          v-if="selectedBranch"
          class="checkin-btn"
          :disabled="alreadyVisitedToday || locationStatus === 'checking'"
          @click="doCheckIn"
        >
          <span v-if="locationStatus === 'checking'" class="btn-spinner" />
          {{ locationStatus === 'checking' ? 'Checking location…' : 'Check in' }}
        </button>

        <p v-if="locationStatus === 'too-far'" class="location-error">
          You're {{ locationDistKm >= 1 ? locationDistKm.toFixed(1) + ' km' : Math.round(locationDistKm * 1000) + ' m' }} away — you need to be within 100 m of this branch to check in.
        </p>
        <p v-else-if="locationStatus === 'denied'" class="location-error">
          Location access is required to check in. Allow it in your browser settings, or enable the bypass in Settings.
        </p>

        <p v-if="scanError" class="scan-error">{{ scanError }}</p>

        <p class="qr-tip">
          Need a QR code to scan? Open
          <a href="https://tpl-passport.vercel.app/qr-print" target="_blank" rel="noopener" class="qr-tip-link">tpl&#8209;passport.vercel.app/qr&#8209;print</a>
          on another device.
        </p>
      </div>
    </template>

  </main>

  <!-- ── QR Scanner overlay ────────────────────── -->
  <Teleport to="body">
    <div v-if="scannerActive" class="scanner-overlay">
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
import { useStampColor, getStampShape } from '~/composables/useStamp'
import { physicalBranches } from '~/composables/useRegion'
import { savePhoto } from '~/composables/usePhotoStore'

const route   = useRoute()
const passport = usePassportStore()

// Branch selection — pre-filled from ?branch=CODE query param
const selectedCode = ref(route.query.branch ?? '')
const prefilled    = computed(() => !!route.query.branch)
const scanned      = ref(false)   // true after a successful QR scan

const sortedBranches = [...physicalBranches].sort((a, b) => a.BranchName.localeCompare(b.BranchName))

// Combo box state
const searchText   = ref('')
const showDropdown = ref(false)

const filteredBranches = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return sortedBranches
  return sortedBranches.filter(b => b.BranchName.toLowerCase().includes(q))
})

function selectBranch(branch) {
  selectedCode.value = branch.BranchCode
  searchText.value   = branch.BranchName
  showDropdown.value = false
}

function onComboBlur() {
  setTimeout(() => { showDropdown.value = false }, 150)
}

const selectedBranch = computed(() =>
  selectedCode.value
    ? physicalBranches.find(b => b.BranchCode === selectedCode.value) ?? null
    : null
)

const selectedRegion = computed(() => selectedBranch.value?.District ?? '')

const alreadyVisitedToday = computed(() =>
  passport.hasVisitedToday(selectedBranch.value?.BranchCode)
)

// Stamp preview styling
const previewStampStyle = computed(() => {
  if (!selectedBranch.value) return {}
  const { color, bg, border } = useStampColor(selectedBranch.value.WardNo)
  return { color, background: bg, borderColor: border, borderRadius: getStampShape(selectedBranch.value.BranchCode).borderRadius }
})

// Note + photo
const noteText     = ref('')
const photoPreview = ref(null)
const photoFile    = ref(null)

function onPhotoCapture(event) {
  const file = event.target.files?.[0]
  if (!file) return
  photoFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => { photoPreview.value = e.target.result }
  reader.readAsDataURL(file)
}

// Check-in
const result         = ref(null)
const locationStatus = ref('idle') // 'idle' | 'checking' | 'too-far' | 'denied'
const locationDistKm = ref(null)

// Reset location status whenever the selected branch changes
watch(selectedCode, () => { locationStatus.value = 'idle'; locationDistKm.value = null })

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function doCheckIn() {
  if (!selectedBranch.value || alreadyVisitedToday.value) return

  if (!passport.profile.bypassLocationFence) {
    locationStatus.value = 'checking'
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
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
    } catch {
      locationStatus.value = 'denied'
      return
    }
  }

  locationStatus.value = 'idle'
  const timestamp = passport.checkIn(selectedBranch.value.BranchCode, noteText.value.trim())
  if (timestamp) {
    if (photoFile.value) savePhoto(timestamp, photoFile.value)
    result.value = {
      branchCode: selectedBranch.value.BranchCode,
      branchName: selectedBranch.value.BranchName,
      region:     selectedRegion.value,
    }
  }
}

const successStampStyle = computed(() => {
  if (!result.value) return {}
  const branch = physicalBranches.find(b => b.BranchCode === result.value.branchCode)
  if (!branch) return {}
  const { color, bg, border } = useStampColor(branch.WardNo)
  return { color, background: bg, borderColor: border, borderRadius: getStampShape(branch.BranchCode).borderRadius }
})

function reset() {
  result.value       = null
  selectedCode.value = ''
  searchText.value   = ''
  scanned.value      = false
  noteText.value     = ''
  photoPreview.value = null
  photoFile.value    = null
}

// ── QR Scanner ────────────────────────────────

const scannerActive = ref(false)
const scanError     = ref('')
const videoEl       = ref(null)
const scanCanvas    = ref(null)
let stream = null
let rafId  = null

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

  // Wait until the video has a real frame
  if (video.readyState < video.HAVE_ENOUGH_DATA) {
    rafId = requestAnimationFrame(scanLoop)
    return
  }

  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
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
    if (branch && physicalBranches.find(b => b.BranchCode === branch)) {
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
}

// Clean up camera if user navigates away mid-scan
onUnmounted(closeScanner)
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

/* Combo box */
.combo-wrap {
  position: relative;
}

.branch-combo {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  box-shadow: var(--shadow-sm);
  box-sizing: border-box;
}

.branch-combo:focus { border-color: var(--tpl-blue); }

.combo-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  max-height: 220px;
  overflow-y: auto;
  z-index: 100;
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.combo-option {
  padding: 11px 16px;
  font-size: 0.9rem;
  color: var(--color-text);
  cursor: pointer;
}

.combo-option:hover { background: color-mix(in srgb, var(--tpl-blue) 8%, var(--color-surface)); }

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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0 24px;
  text-align: center;
}

.success-stamp {
  width: 110px;
  height: 110px;
  border: 3px solid currentColor;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  animation: stamp-in 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

.success-ring {
  position: absolute;
  inset: 7px;
  border: 1.5px solid currentColor;
  opacity: 0.35;
}

@keyframes stamp-in {
  from { transform: scale(1.4) rotate(-8deg); opacity: 0; }
  to   { transform: scale(1) rotate(0deg);    opacity: 1; }
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
  margin-bottom: 12px;
}

.success-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 280px;
}

.btn-outline {
  display: block;
  padding: 13px;
  border: 1.5px solid var(--tpl-blue);
  border-radius: var(--radius);
  font-size: 0.95rem;
  font-weight: 700;
  font-family: var(--font-body);
  color: var(--tpl-blue);
  text-align: center;
  text-decoration: none;
}

.btn-ghost {
  padding: 12px;
  background: transparent;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
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
