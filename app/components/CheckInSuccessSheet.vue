<template>
  <BaseSheet v-model:open="open" :height="sheetHeight">
    <div v-if="result">
      <div class="success-hero">
        <div class="success-stamp-wrap">
          <StampShape :branch-code="result.branchCode" :ward-no="result.wardNo" :size="110" />
          <div class="success-check-badge">
            <IconSuccessCheck />
          </div>
        </div>
        <p class="success-label">Stamp collected!</p>
        <p class="success-branch">{{ result.branchName }}</p>
        <NuxtLink :to="`/branch/${result.branchCode}`" class="btn-primary">View branch</NuxtLink>
        <label v-if="!photoBlob" class="photo-btn">
          <IconPhoto />
          Add photo
          <input type="file" accept="image/*" class="photo-input" @change="onPhotoCapture" />
        </label>
        <template v-if="photoBlob">
          <img :src="photoPreview ?? undefined" class="success-photo-preview" alt="Check-in photo" />
          <button class="save-photo-btn" @click="savePhotoToDevice">
            <IconSave />
            Save photo
          </button>
        </template>
      </div>

      <div v-if="newBadges.length" class="badge-earned-list">
        <div v-for="badge in newBadges" :key="badge.id" class="badge-earned-row">
          <svg class="badge-earned-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9h12l-2-6H8L6 9z" /><circle cx="12" cy="15" r="5" />
          </svg>
          <div class="badge-earned-info">
            <span class="badge-earned-label">Badge earned!</span>
            <span class="badge-earned-title">{{ badge.title }}</span>
          </div>
        </div>
      </div>

      <div v-if="showSignInNudge" class="signin-nudge">
        <p class="signin-nudge__text">Save your progress — access your passport on any device</p>
        <NuxtLink to="/login" class="signin-nudge__link" @click="open = false; $posthog?.capture('signin_nudge_tapped')">Sign in</NuxtLink>
      </div>

      <div v-if="nearbyBranches.length" class="success-nearby">
        <p class="success-nearby-heading">Also nearby</p>
        <NearbyBranchList :branches="nearbyBranches" :navigate-to-branch-page="true" />
      </div>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
import { usePassportStore } from '~/stores/passport'
import { sortedBranches, haversineKm } from '~/composables/useRegion'
import { BADGES, buildBadgeCtx, useBadgeCtx } from '~/composables/useBadges'
import { savePhoto } from '~/composables/usePhotoStore'
import { compressPhoto, uploadCheckInPhoto } from '~/lib/checkInPhoto'
import { canSyncToServer, useAuthKnown, useSignedIn } from '~/composables/useAuthState'
import IconPhoto from '~/components/icons/IconPhoto.vue'
import IconSave from '~/components/icons/IconSave.vue'
import IconSuccessCheck from '~/components/icons/IconSuccessCheck.vue'

// The sheet opens when a result is set and clears it when closed.
export interface CheckInResult {
  timestamp: string
  branchCode: string
  branchName: string
  region: string
  wardNo: number
}
const result = defineModel<CheckInResult | null>('result', { default: null })

const { $posthog } = useNuxtApp()
const passport = usePassportStore()
const signedIn = useSignedIn()
const authKnown = useAuthKnown()

const sheetHeight = 'calc(100svh - var(--nav-height) - 60px)'
const open = ref(false)
const photoPreview = ref<string | null>(null)  // object URL — revoked when sheet closes / photo changes
const photoBlob = ref<Blob | null>(null)  // compressed JPEG blob, kept for save-to-device

function clearPhoto() {
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photoBlob.value = null
  photoPreview.value = null
}

watch(result, val => { if (val) open.value = true })
watch(open, isOpen => {
  if (!isOpen) {
    result.value = null
    clearPhoto()
  }
})
onUnmounted(clearPhoto)

const showSignInNudge = computed(() =>
  authKnown.value && !signedIn.value && passport.checkIns.length === 1
)

async function onPhotoCapture(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const blob = await compressPhoto(file)
  if (!blob) return
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photoBlob.value = blob
  photoPreview.value = URL.createObjectURL(blob)
  const ts = result.value?.timestamp
  if (ts) {
    savePhoto(ts, blob)
    passport.markCheckInHasPhoto(ts)
    if (canSyncToServer()) {
      void uploadCheckInPhoto(blob).then((publicUrl) => {
        if (publicUrl) passport.markCheckInHasPhoto(ts, publicUrl)
      })
    }
    $posthog?.capture('photo_taken', { branch_code: result.value?.branchCode })
  }
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

// Badges that this check-in newly earned.
const badgeCtx = useBadgeCtx()
const newBadges = computed(() => {
  const res = result.value
  if (!res) return []
  const prevCheckIns = passport.checkIns.filter(c => c.timestamp !== res.timestamp)
  const ctxBefore = buildBadgeCtx({
    checkIns: prevCheckIns,
    visitedBranchCodes: new Set(prevCheckIns.map(c => c.branchCode)),
    completedChallenges: passport.completedChallenges ?? [],
    homeBranch: passport.profile.homeBranch ?? null,
  })
  return BADGES.filter(b => !b.earned(ctxBefore) && b.earned(badgeCtx.value))
})

const nearbyBranches = computed(() => {
  const res = result.value
  if (!res) return []
  const current = sortedBranches.find(b => b.BranchCode === res.branchCode)
  if (!current?.Lat || !current?.Long) return []
  return sortedBranches
    .filter(b => b.BranchCode !== res.branchCode)
    .map(b => ({ ...b, distKm: haversineKm(current.Lat, current.Long, b.Lat, b.Long) }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 2)
})
</script>

<style scoped>
.photo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 200px;
  white-space: nowrap;
  padding: 10px 16px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-mid);
  background: var(--color-surface);
  cursor: pointer;

  & svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
}

.photo-input {
  display: none;
}

/* Stamp preview */
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

.success-photo-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.save-photo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 200px;
  white-space: nowrap;
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

/* ── Badge earned rows ── */
.badge-earned-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.badge-earned-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--tpl-blue) 25%, transparent);
  border-radius: var(--radius);
}

.badge-earned-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--tpl-blue);
}

.badge-earned-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.badge-earned-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--tpl-blue);
}

.badge-earned-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
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
</style>
