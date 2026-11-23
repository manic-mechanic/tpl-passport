// A visit's page (/visit/[id]): its address, and what happens to its photo
// after it's taken (backing it up to the auth server, saving it to the device).

import { uploadCheckInPhotoResult, type UploadFailure } from '~/lib/checkInPhoto'
import { reportError } from '~/lib/reportError'

// A visit is a check-in, and a check-in's timestamp is its id everywhere:
// the Pinia store, the photo store (IndexedDB key) and the auth server
// (/api/checkins/:timestamp). So the page is /visit/<timestamp>.
export function visitPath(timestamp: string): string {
  return `/visit/${encodeURIComponent(timestamp)}`
}

// Where a visit's photo stands, as shown under the photo.
// - local: kept on this device only (not signed in); sign-in sync uploads it.
// - uploading / uploaded: the hosted copy is on its way / saved on the account.
// - failed: the upload, or saving its URL on the check-in ('patch'), failed.
//   The photo is still on this device.
export type PhotoUploadStatus =
  | { state: 'local' }
  | { state: 'uploading' }
  | { state: 'uploaded' }
  | { state: 'failed', reason: UploadFailure | 'patch' }

// Backups in flight, by check-in timestamp: the latest one for each. Only the
// latest backup of a check-in saves its URL, so a photo changed while an
// earlier one is still uploading isn't overwritten when that one finishes.
const inFlight = new Map<string, Promise<PhotoUploadStatus>>()

// The backup still running for this check-in, if any (the visit page's, or the
// sign-in sync's), so another caller can wait for it instead of uploading the
// same photo again.
export function photoBackupInFlight(timestamp: string): Promise<PhotoUploadStatus> | null {
  return inFlight.get(timestamp) ?? null
}

// Uploads the photo and saves its hosted URL on the check-in. With a hosted
// URL already in hand (an upload whose URL didn't reach the check-in), only
// the URL is saved again. Failures are reported where they happen:
// uploadCheckInPhotoResult and patchCheckInPhoto (via markHosted) report
// the unexpected ones. A backup overtaken by a newer one for the same
// check-in resolves to { state: 'superseded' } without saving its URL.
export function backUpVisitPhoto(
  timestamp: string,
  blob: Blob | null,
  markHosted: (timestamp: string, url: string) => Promise<boolean>,
  hostedUrl: string | null = null,
): Promise<PhotoUploadStatus | { state: 'superseded' }> {
  let current: Promise<PhotoUploadStatus> | null = null
  const run = (async (): Promise<PhotoUploadStatus | { state: 'superseded' }> => {
    let url = hostedUrl
    if (!url) {
      if (!blob) return { state: 'failed', reason: 'failed' }
      const upload = await uploadCheckInPhotoResult(blob)
      if (inFlight.get(timestamp) !== current) return { state: 'superseded' }
      if (!upload.ok) return { state: 'failed', reason: upload.reason }
      url = upload.url
    }
    return await markHosted(timestamp, url) ? { state: 'uploaded' } : { state: 'failed', reason: 'patch' }
  })()
  // What waiters see: a superseded run hands them the newer one's result.
  const waited: Promise<PhotoUploadStatus> = run.then(r => r.state === 'superseded'
    ? (inFlight.get(timestamp) ?? { state: 'failed', reason: 'failed' })
    : r)
  current = waited
  inFlight.set(timestamp, waited)
  void waited.finally(() => { if (inFlight.get(timestamp) === waited) inFlight.delete(timestamp) })
  return run
}

export function uploadFailureText(reason: UploadFailure | 'patch'): string {
  switch (reason) {
    case 'unauthorized': return 'Not uploaded: you’re signed out. Sign in to back it up.'
    case 'rate_limited': return 'Not uploaded yet: too many photos at once.'
    case 'quota': return 'Not uploaded: your photo storage is full.'
    default: return 'Upload failed.'
  }
}

export const PHOTO_FILE_NAME = 'tpl-checkin.jpg'

// The share sheet was closed without choosing anything. Not an error.
export function isShareCancel(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'AbortError'
}

function download(blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = PHOTO_FILE_NAME
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 0)
}

// Opens the native share sheet (iOS/Android) so the photo can be saved with
// "Save Image", or downloads it where files can't be shared (desktop).
// Call it straight from the tap, with the blob already loaded: iOS only
// opens the share sheet while the tap still counts as user activation.
// Cancelling the share sheet is normal; any other share failure is
// reported and falls back to a download.
export async function savePhotoToDevice(blob: Blob): Promise<'shared' | 'cancelled' | 'downloaded'> {
  const file = new File([blob], PHOTO_FILE_NAME, { type: blob.type || 'image/jpeg' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      if (isShareCancel(error)) return 'cancelled'
      reportError(error, { area: 'photo', operation: 'share_photo' })
    }
  }
  download(blob)
  return 'downloaded'
}
