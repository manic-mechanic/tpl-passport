<template>
  <Teleport to="body">
    <div v-if="active" class="scanner-overlay">
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

      <button class="scanner-close" aria-label="Close scanner" @click="active = false">
        <IconClose />
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import IconClose from '~/components/icons/IconClose.vue'

// Camera QR scanner. Emits `scanned` with the branch code from a branch QR
// URL (?branch=CODE), or `error` with a user-facing message.
const active = defineModel('active', { type: Boolean, default: false })
const emit = defineEmits<{
  scanned: [branchCode: string]
  error: [message: string]
}>()

const videoEl = ref<HTMLVideoElement | null>(null)
const scanCanvas = ref<HTMLCanvasElement | null>(null)
let stream: MediaStream | null = null
let rafId: number | null = null
let ctx: CanvasRenderingContext2D | null = null  // canvas 2d context — hoisted so it's not re-fetched every frame
// jsQR is ~230 KB, so it's loaded when the scanner opens rather than with the
// check-in page (which every visitor prefetches from the bottom nav).
let jsQR: typeof import('jsqr').default | null = null

watch(active, (isActive) => {
  if (isActive) void start()
  else stop()
})

async function start() {
  await nextTick()
  try {
    const [media, decoder] = await Promise.all([
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      }),
      import('jsqr'),
    ])
    jsQR = decoder.default
    // Closed while the permission prompt was open: release the camera.
    if (!active.value || !videoEl.value) {
      media.getTracks().forEach(t => t.stop())
      return
    }
    stream = media
    videoEl.value.srcObject = stream
    await videoEl.value.play()
    // Set canvas dimensions once — videoWidth/Height are fixed for a given camera stream
    scanCanvas.value!.width = videoEl.value.videoWidth
    scanCanvas.value!.height = videoEl.value.videoHeight
    ctx = scanCanvas.value!.getContext('2d')
    rafId = requestAnimationFrame(scanLoop)
  } catch {
    if (!active.value) return
    stop()
    emit('error', 'Camera access denied — check your browser settings.')
    active.value = false
  }
}

function scanLoop() {
  const video = videoEl.value
  const canvas = scanCanvas.value
  if (!video || !canvas || !ctx || !jsQR || !active.value) return

  if (video.readyState < video.HAVE_ENOUGH_DATA) {
    rafId = requestAnimationFrame(scanLoop)
    return
  }

  ctx.drawImage(video, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imageData.data, imageData.width, imageData.height)

  if (code) {
    handleResult(code.data)
    return
  }

  rafId = requestAnimationFrame(scanLoop)
}

function handleResult(data: string) {
  active.value = false
  try {
    const branch = new URL(data).searchParams.get('branch')
    if (branch) emit('scanned', branch)
    else emit('error', 'QR code not recognised as a TPL branch.')
  } catch {
    emit('error', 'QR code not recognised as a TPL branch.')
  }
}

function stop() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
  ctx = null
}

onUnmounted(stop)
</script>

<style scoped>
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
</style>
