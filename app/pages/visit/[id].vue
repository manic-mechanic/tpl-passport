<template>
  <main class="page-content">
    <PageBanner :title="branch?.BranchName ?? 'Visit'" :back-label="backLabel" @back="goBack" />

    <template v-if="visit">
      <div class="visit-hero">
        <div class="visit-stamp-wrap" :class="{ 'visit-stamp-wrap--new': justCheckedIn }">
          <StampShape :branch-code="visit.branchCode" :ward-no="branch?.WardNo ?? 0" :size="110" />
          <div v-if="justCheckedIn" class="visit-check-badge">
            <IconSuccessCheck />
          </div>
        </div>
        <p v-if="justCheckedIn" class="visit-label">Stamp collected!</p>
        <p class="visit-branch">{{ branch?.BranchName ?? visit.branchCode }}</p>
        <p class="visit-date">{{ visitDate }}</p>
        <NuxtLink v-if="branch" :to="{ path: `/branch/${visit.branchCode}`, state: { visitSource } }" class="btn-primary">View branch</NuxtLink>
      </div>

      <p v-if="visit.note?.trim()" class="visit-note">{{ visit.note }}</p>

      <section class="visit-photo" aria-label="Photo">
        <template v-if="photoSrc">
          <img :src="photoSrc" class="visit-photo-img" alt="Check-in photo" @load="loadHostedBlob" />
          <p class="photo-status" :class="`photo-status--${status.state}`" role="status">
            <span v-if="status.state === 'uploading'" class="photo-spinner" aria-hidden="true" />
            <IconCheckMark v-else-if="status.state === 'uploaded'" class="photo-status-icon" aria-hidden="true" />
            {{ statusText }}
            <button v-if="canRetry" type="button" class="photo-retry" @click="retryUpload">Retry</button>
          </p>
        </template>
        <p v-if="photoError" class="photo-error" role="alert">{{ photoError }}</p>

        <div class="photo-actions">
          <label class="photo-btn">
            <IconPhoto />
            {{ photoSrc ? 'Change photo' : 'Add photo' }}
            <input type="file" accept="image/*" class="photo-input" @change="onPhotoCapture" />
          </label>
          <button v-if="photoBlob || hostedSrc" type="button" class="photo-btn" @click="onSavePhoto">
            <IconSave />
            Save photo
          </button>
        </div>
      </section>

      <div v-if="justCheckedIn && newBadges.length" class="badge-earned-list">
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
        <p class="signin-nudge__text">Save your progress and open your passport on any device</p>
        <NuxtLink to="/login" class="signin-nudge__link" @click="$posthog?.capture('signin_nudge_tapped')">Sign in</NuxtLink>
      </div>

      <div v-if="justCheckedIn && nearbyBranches.length" class="visit-nearby">
        <p class="visit-nearby-heading">Also nearby</p>
        <NearbyBranchList :branches="nearbyBranches" :navigate-to-branch-page="true" />
      </div>
    </template>

    <p v-else-if="loadingVisits" class="empty-state">Loading…</p>

    <p v-else class="empty-state">
      We couldn't find that visit.<br>
      <NuxtLink to="/history">See your history</NuxtLink>
    </p>
  </main>
</template>

<script setup lang="ts">
import { usePassportStore } from '~/stores/passport'
import { branchesByCode, sortedBranches, haversineKm } from '~/composables/useRegion'
import { BADGES, buildBadgeCtx } from '~/composables/useBadges'
import { getPhotoBlob, savePhoto } from '~/composables/usePhotoStore'
import { compressPhoto } from '~/lib/checkInPhoto'
import { backUpVisitPhoto, photoBackupInFlight, savePhotoToDevice, uploadFailureText, type PhotoUploadStatus } from '~/lib/visitPhoto'
import { reportError } from '~/lib/reportError'
import { canSyncToServer, useAccountSyncing, useAuthKnown, useSignedIn } from '~/composables/useAuthState'
import IconCheckMark from '~/components/icons/IconCheckMark.vue'
import IconPhoto from '~/components/icons/IconPhoto.vue'
import IconSave from '~/components/icons/IconSave.vue'
import IconSuccessCheck from '~/components/icons/IconSuccessCheck.vue'

// One visit (check-in), at /visit/<timestamp> (see ~/lib/visitPhoto). It is
// where a check-in lands, and where History opens a visit. The check-in
// page marks its navigation here with history state { checkedIn: true },
// which shows the "Stamp collected!" extras and survives a reload.

const { $posthog } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const passport = usePassportStore()
const signedIn = useSignedIn()
const authKnown = useAuthKnown()

const timestamp = computed(() => String(route.params.id ?? ''))
const visit = computed(() => passport.checkIns.find(c => c.timestamp === timestamp.value) ?? null)
const branch = computed(() => visit.value ? branchesByCode[visit.value.branchCode] : undefined)
// Not here yet, but it may be coming: on a new device the visit arrives with
// the sign-in sync, after the session check.
const accountSyncing = useAccountSyncing()
const loadingVisits = computed(() => !authKnown.value || accountSyncing.value)

const historyState = router.options.history.state
const justCheckedIn = historyState?.checkedIn === true
const back = typeof historyState?.back === 'string' ? historyState.back : ''

const backLabel = back.startsWith('/check-in') ? 'Check in'
  : back.startsWith('/branch/') ? 'Branch'
  : back === '/' ? 'Home'
  : 'History'

// For the branch page's analytics: the source a branch view had back when
// the visit was a panel on Check in or History.
const visitSource = justCheckedIn ? 'check-in' : back.startsWith('/history') ? 'history' : 'visit'

function goBack() {
  if (back) router.back()
  else navigateTo('/history')
}

const visitDate = computed(() => {
  if (!visit.value) return ''
  return new Date(visit.value.timestamp).toLocaleString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
})

// ── Photo ─────────────────────────────────────────────────────────────────
// The photo shown is this device's copy when it has one (kept as a blob, so
// "Save photo" can hand it to the share sheet straight from the tap),
// otherwise the hosted copy.

const photoBlob = ref<Blob | null>(null)
const localSrc = ref<string | null>(null)
const hostedSrc = computed(() => visit.value?.photoUri ?? null)
const photoSrc = computed(() => localSrc.value ?? hostedSrc.value)
const photoError = ref('')

function showBlob(blob: Blob | null) {
  if (localSrc.value) URL.revokeObjectURL(localSrc.value)
  photoBlob.value = blob
  localSrc.value = blob ? URL.createObjectURL(blob) : null
}
onUnmounted(() => showBlob(null))

// This device's copy, loaded once the visit is known: on a new device that
// can be after the sign-in sync brings it in. Loaded again if a sync brings
// a photo for a visit that had none here.
let loadedFor: string | null = null
watch(() => visit.value?.hasPhoto ? timestamp.value : null, async (ts) => {
  if (!ts || loadedFor === ts || photoBlob.value) return
  loadedFor = ts
  let blob: Blob | null = null
  try {
    blob = await getPhotoBlob(ts)
  } catch {
    // IndexedDB unavailable (e.g. some private modes): the hosted copy shows.
  }
  // A photo taken while this was loading wins.
  if (blob && !photoBlob.value && ts === timestamp.value) showBlob(blob)
}, { immediate: true })

// With only the hosted copy, fetch it once the image has shown (not in
// competition with it), so "Save photo" can share it straight from the tap.
// If the photo host doesn't allow that, "Save photo" opens the hosted copy.
let hostedFetchedFor: string | null = null
async function loadHostedBlob() {
  const url = hostedSrc.value
  if (photoBlob.value || !url || localSrc.value || hostedFetchedFor === url) return
  hostedFetchedFor = url
  const blob = await fetch(url).then(r => r.ok ? r.blob() : null, () => null)
  if (blob && !photoBlob.value && hostedSrc.value === url) showBlob(blob)
}

// Set by an upload on this page. Until then it follows the check-in: a
// hosted URL the server has means uploaded; otherwise (photoPending, or no
// hosted URL) a signed-in user's photo hasn't been uploaded yet (the next
// sync, or Retry, uploads it). 'unsaved': IndexedDB couldn't keep it and
// there was no upload to fall back on.
type VisitPhotoStatus = PhotoUploadStatus | { state: 'pending' } | { state: 'unsaved' }
const uploadStatus = ref<VisitPhotoStatus | null>(null)
const status = computed<VisitPhotoStatus>(() => {
  if (uploadStatus.value) return uploadStatus.value
  const v = visit.value
  if (v?.photoUri && !v.photoPending) return { state: 'uploaded' }
  return signedIn.value ? { state: 'pending' } : { state: 'local' }
})
const statusText = computed(() => {
  const s = status.value
  switch (s.state) {
    case 'uploading': return 'Uploading…'
    case 'uploaded': return 'Uploaded'
    case 'pending': return 'Not uploaded yet.'
    case 'local': return 'Saved on this device'
    case 'unsaved': return 'Not saved: this device couldn’t keep it. Sign in to back it up.'
    case 'failed': return uploadFailureText(s.reason)
  }
  return ''
})
// Retry needs something to send: this device's photo, or a hosted URL the
// server hasn't taken yet.
const canRetry = computed(() => {
  const s = status.value
  const retryable = s.state === 'pending' || (s.state === 'failed' && s.reason !== 'quota' && s.reason !== 'unauthorized')
  const v = visit.value
  return retryable && (!!photoBlob.value || !!(v?.photoUri && v.photoPending))
})

let uploadRun = 0
// A new photo always starts its own backup. Retry joins one already running
// for this visit (e.g. the sign-in sync's) instead of uploading it twice.
async function upload(blob: Blob | null, hostedUrl: string | null, joinRunning: boolean) {
  const ts = timestamp.value
  const run = ++uploadRun
  uploadStatus.value = { state: 'uploading' }
  const running = joinRunning ? photoBackupInFlight(ts) : null
  let result = running ? await running : await backUpVisitPhoto(ts, blob, passport.markCheckInHasPhoto, hostedUrl)
  if (result.state === 'superseded') result = await photoBackupInFlight(ts) ?? { state: 'failed', reason: 'failed' }
  if (run === uploadRun) uploadStatus.value = result
}

function retryUpload() {
  const v = visit.value
  // The upload worked but the server didn't take its URL: send the URL again.
  if (v?.photoUri && v.photoPending) void upload(null, v.photoUri, true)
  else void upload(photoBlob.value, null, true)
}

async function onPhotoCapture(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''  // so picking the same photo again still fires change
  const ts = timestamp.value
  if (!file || !visit.value) return
  photoError.value = ''
  const blob = await compressPhoto(file)
  if (!blob) {
    photoError.value = 'Couldn’t read that photo. Try another one.'
    return
  }
  showBlob(blob)
  let saved = true
  try {
    await savePhoto(ts, blob)
  } catch (error) {
    saved = false
    reportError(error, { area: 'persistence', operation: 'save_photo' })
  }
  $posthog?.capture('photo_taken', { branch_code: visit.value.branchCode, saved_on_device: saved })
  // Only a photo this device kept is recorded before it uploads; one it
  // couldn't keep is recorded by the upload, or not at all.
  if (saved) void passport.markCheckInHasPhoto(ts)
  if (canSyncToServer()) await upload(blob, null, false)
  else uploadStatus.value = saved ? { state: 'local' } : { state: 'unsaved' }
}

async function onSavePhoto() {
  if (!photoBlob.value) {
    // The hosted copy couldn't be fetched here: open it, to save from there.
    if (hostedSrc.value) window.open(hostedSrc.value, '_blank', 'noopener')
    $posthog?.capture('photo_saved', { outcome: 'opened', branch_code: visit.value?.branchCode })
    return
  }
  const outcome = await savePhotoToDevice(photoBlob.value)
  $posthog?.capture('photo_saved', { outcome, branch_code: visit.value?.branchCode })
}

// ── After checking in ─────────────────────────────────────────────────────

const showSignInNudge = computed(() =>
  justCheckedIn && authKnown.value && !signedIn.value && passport.checkIns.length === 1
)

// Badges this check-in earned: those earned with it and not with the visits
// before it. Shown only right after checking in, since they're worked out
// from today's home branch and challenges.
const newBadges = computed(() => {
  const v = visit.value
  if (!v) return []
  const ctxFor = (checkIns: typeof passport.checkIns) => buildBadgeCtx({
    checkIns,
    visitedBranchCodes: new Set(checkIns.map(c => c.branchCode)),
    completedChallenges: passport.completedChallenges ?? [],
    homeBranch: passport.profile.homeBranch ?? null,
  })
  const before = ctxFor(passport.checkIns.filter(c => c.timestamp < v.timestamp))
  const after = ctxFor(passport.checkIns.filter(c => c.timestamp <= v.timestamp))
  return BADGES.filter(b => !b.earned(before) && b.earned(after))
})

const nearbyBranches = computed(() => {
  const current = branch.value
  if (!current?.Lat || !current?.Long) return []
  return sortedBranches
    .filter(b => b.BranchCode !== current.BranchCode)
    .map(b => ({ ...b, distKm: haversineKm(current.Lat, current.Long, b.Lat, b.Long) }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 2)
})
</script>

<style scoped>
.visit-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  margin-bottom: 24px;
}

.visit-stamp-wrap {
  position: relative;
  margin-bottom: 12px;
}

.visit-stamp-wrap--new {
  animation: stamp-in 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

.visit-check-badge {
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

.visit-label {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  font-optical-sizing: auto;
}

.visit-branch {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-mid);
}

.visit-date {
  font-size: 0.8125rem;
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

.visit-note {
  padding: 12px 16px;
  margin-bottom: 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* ── Photo ── */
.visit-photo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
}

.visit-photo-img {
  width: 100%;
  max-width: 320px;
  max-height: 320px;
  object-fit: cover;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

.photo-status {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-align: center;
}

.photo-status--uploaded {
  color: var(--color-success);
}

.photo-status--failed {
  color: var(--color-error);
}

.photo-status-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.photo-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--tpl-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.photo-retry {
  padding: 4px 10px;
  border: 1.5px solid currentColor;
  border-radius: var(--radius-pill);
  background: transparent;
  color: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  font-family: var(--font-body);
  cursor: pointer;
}

.photo-error {
  font-size: 0.875rem;
  color: var(--color-error);
  text-align: center;
}

.photo-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

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

.visit-nearby {
  width: 100%;
}

.visit-nearby-heading {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin-bottom: 10px;
}
</style>
