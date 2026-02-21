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

      <!-- Branch selector (manual — hidden when pre-filled via URL or QR scan) -->
      <div v-if="!prefilled && !scanned" class="field-group">
        <label class="field-label" for="branch-select">Branch</label>
        <select id="branch-select" v-model="selectedCode" class="branch-select">
          <option value="">Choose a branch…</option>
          <option v-for="b in sortedBranches" :key="b.BranchCode" :value="b.BranchCode">
            {{ b.BranchName }}
          </option>
        </select>
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
            Photo <span class="optional">optional · not saved</span>
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
          class="checkin-btn"
          :disabled="!selectedBranch || alreadyVisitedToday"
          @click="doCheckIn"
        >
          Collect stamp
        </button>

        <button class="qr-btn" @click="openScanner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="15" height="15">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            <rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/>
          </svg>
          Scan QR code
        </button>

        <p v-if="scanError" class="scan-error">{{ scanError }}</p>
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
import { useStampColor, getStampShape } from '~/composables/useStampColor'
import { physicalBranches, getRegion } from '~/composables/useRegion'

const route   = useRoute()
const passport = usePassportStore()

// Branch selection — pre-filled from ?branch=CODE query param
const selectedCode = ref(route.query.branch ?? '')
const prefilled    = computed(() => !!route.query.branch)
const scanned      = ref(false)   // true after a successful QR scan

const sortedBranches = [...physicalBranches].sort((a, b) => a.BranchName.localeCompare(b.BranchName))

const selectedBranch = computed(() =>
  selectedCode.value
    ? physicalBranches.find(b => b.BranchCode === selectedCode.value) ?? null
    : null
)

const selectedRegion = computed(() => getRegion(selectedBranch.value?.WardNo) ?? '')

const alreadyVisitedToday = computed(() =>
  passport.hasVisitedToday(selectedBranch.value?.BranchCode)
)

// Stamp preview styling
const previewStampStyle = computed(() => {
  if (!selectedBranch.value) return {}
  const { color, bg, border } = useStampColor(selectedBranch.value.WardNo)
  return { color, background: bg, borderColor: border, borderRadius: getStampShape(selectedBranch.value.BranchCode) }
})

// Note + photo
const noteText    = ref('')
const photoPreview = ref(null)

function onPhotoCapture(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => { photoPreview.value = e.target.result }
  reader.readAsDataURL(file)
}

// Check-in
const result = ref(null)

function doCheckIn() {
  if (!selectedBranch.value || alreadyVisitedToday.value) return
  const ok = passport.checkIn(selectedBranch.value.BranchCode, noteText.value.trim())
  if (ok) {
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
  return { color, background: bg, borderColor: border, borderRadius: getStampShape(branch.BranchCode) }
})

function reset() {
  result.value       = null
  selectedCode.value = ''
  scanned.value      = false
  noteText.value     = ''
  photoPreview.value = null
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

.branch-select {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  box-shadow: var(--shadow-sm);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238c849e' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 38px;
}

.branch-select:focus { border-color: var(--tpl-blue); }

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
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  font-optical-sizing: auto;
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

.qr-btn {
  width: 100%;
  padding: 12px;
  background: transparent;
  color: var(--tpl-blue);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: border-color 0.15s, background 0.15s;
}

.qr-btn:active {
  background: color-mix(in srgb, var(--tpl-blue) 6%, transparent);
  border-color: var(--tpl-blue);
}

.scan-error {
  font-size: 0.8rem;
  color: #c0392b;
  text-align: center;
  padding: 0 8px;
}

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
