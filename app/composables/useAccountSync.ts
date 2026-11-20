// Shared signed-in state plus the sign-in / sign-out sync flows.
// Used by app.vue (app load and Google OAuth return), login.vue and settings.vue
// so all three paths reconcile local and server data the same way.

import * as Sentry from '@sentry/nuxt'
import { usePassportStore } from '~/stores/passport'
import { fetchCheckIns, pushCheckIn } from '~/composables/useCheckInSync'
import { fetchProfile, pushProfile } from '~/composables/useProfileSync'
import { clearPhotos, getPhotoBlob, movePhoto } from '~/composables/usePhotoStore'
import { authClient } from '~/lib/auth-client'
import { uploadCheckInPhotoResult, type UploadFailure } from '~/lib/checkInPhoto'
import { reportError } from '~/lib/reportError'
import { reconcileCheckIns } from '~/lib/checkInSyncMerge'
import { reconcileProfile } from '~/lib/profileSyncMerge'
import { useAccount, useSignedIn } from '~/composables/useAuthState'

// Make sure everything on this device is on the server: merge with the server
// list, push local-only and merged records, and upload photos that only exist
// in IndexedDB. ok is true only if every step succeeded; when photo uploads
// stopped at the server's rate limit or the account's photo quota, reason
// says which, so sign-out can say what to do.
type FlushResult = { ok: true } | { ok: false, reason: 'rate_limited' | 'quota' | 'failed' }

async function flushToServer(): Promise<FlushResult> {
  const passport = usePassportStore()

  const serverCheckIns = await fetchCheckIns()
  if (!serverCheckIns) return { ok: false, reason: 'failed' }

  const { merged, localOnly, updated, photoMoves } = reconcileCheckIns(serverCheckIns, passport.checkIns)
  passport.setCheckIns(merged)

  let ok = true
  for (const { from, to } of photoMoves) {
    try {
      await movePhoto(from, to)
    } catch (error) {
      ok = false
      reportError(error, { area: 'persistence', operation: 'move_photo' })
    }
  }

  const pushes = await Promise.all([...localOnly, ...updated].map(ci => pushCheckIn(ci)))
  if (pushes.includes(false)) ok = false

  // Photos saved on this device that never got a hosted copy. Stop at the
  // rate limit or a full account: the rest would only get the same answer.
  let stoppedAt: Extract<UploadFailure, 'rate_limited' | 'quota'> | null = null
  for (const ci of passport.checkIns.filter(c => c.hasPhoto && !c.photoUri)) {
    try {
      const blob = await getPhotoBlob(ci.timestamp)
      if (!blob) continue
      const upload = await uploadCheckInPhotoResult(blob)
      if (!upload.ok) {
        ok = false
        if (upload.reason === 'rate_limited' || upload.reason === 'quota') {
          stoppedAt = upload.reason
          break
        }
        continue
      }
      if (!(await passport.markCheckInHasPhoto(ci.timestamp, upload.url))) ok = false
    } catch (error) {
      ok = false
      reportError(error, { area: 'sync', operation: 'upload_pending_photo' })
    }
  }

  if (ok) return { ok: true }
  return { ok: false, reason: stoppedAt ?? 'failed' }
}

// Pull the server profile and check-ins into the local store and push up
// anything that only exists locally. Best-effort: failures are reported, not thrown.
export async function syncAccount(fallbackName = '') {
  const passport = usePassportStore()

  // user_profile is the source of truth for name + homeBranch.
  const serverProfile = await fetchProfile()
  const { nextName, nextHomeBranch, shouldPushHomeBranch } = reconcileProfile(
    passport.profile,
    serverProfile,
    fallbackName,
  )
  passport.profile.name = nextName
  passport.profile.homeBranch = nextHomeBranch
  if (shouldPushHomeBranch) {
    await pushProfile({ name: passport.profile.name, homeBranch: passport.profile.homeBranch })
  }

  try {
    await flushToServer()
  } catch (error) {
    reportError(error, { area: 'sync', operation: 'checkin_merge' })
  }
}

export type SignOutResult = { ok: true } | { ok: false, reason: string }

// Why sign-out waits: signing out clears this device, so anything not yet on
// the server would be lost.
const SIGN_OUT_BLOCKED = {
  rate_limited: 'Your photos are still uploading. Try signing out again in a minute.',
  quota: "Your account's photo storage is full, so some photos on this device can't be saved. Signing out now would lose them.",
  failed: "Some check-ins or photos haven't synced yet. Check your connection and try again.",
} as const

// Sign out and wipe this device's copy of the account's data so it can't be
// merged into the next account that signs in here. Nothing is wiped unless
// everything on the device is confirmed on the server and sign-out succeeded.
export async function signOutAndClear(): Promise<SignOutResult> {
  const signedIn = useSignedIn()
  const passport = usePassportStore()
  const { $posthog } = useNuxtApp()

  const flushed = await flushToServer()
  if (!flushed.ok) {
    return { ok: false, reason: SIGN_OUT_BLOCKED[flushed.reason] }
  }

  const { error } = await authClient.signOut()
  if (error) {
    reportError(new Error(`signOut failed: ${error.message ?? error.status}`), { area: 'auth', operation: 'sign_out' })
    return { ok: false, reason: "Couldn't sign out. Please try again." }
  }

  signedIn.value = false
  useAccount().value = null
  passport.clearLocalData()
  try {
    await clearPhotos()
  } catch (error) {
    reportError(error, { area: 'persistence', operation: 'clear_photos' })
  }

  $posthog?.capture('signed_out')
  $posthog?.reset()
  Sentry.setUser(null)
  return { ok: true }
}
