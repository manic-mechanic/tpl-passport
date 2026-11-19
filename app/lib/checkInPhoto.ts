// Shared photo handling for check-ins: compress on device, then (when signed
// in) upload a hosted copy to the auth server.

import { getAuthBase } from '~/lib/config'
import { reportError } from '~/lib/reportError'

// Resize to ≤ maxWidth px wide and re-encode as JPEG to keep IndexedDB and uploads small.
export function compressPhoto(file: Blob, maxWidth = 1200, quality = 0.82): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

// Why an upload didn't produce a hosted copy. The photo stays on the device
// in every case, and the next sync tries it again.
// - unauthorized: not signed in (401).
// - rate_limited: the auth server's per-user upload limit, 20 a minute
//   (429). A big backlog syncing at sign-in can hit it.
// - quota: the account's photo storage is full (507, code photo_quota),
//   after the server has already deleted photos no check-in uses.
// - failed: anything else, including network errors.
export type UploadFailure = 'unauthorized' | 'rate_limited' | 'quota' | 'failed'
export type UploadResult = { ok: true, url: string } | { ok: false, reason: UploadFailure }

// Uploads a compressed photo. Only unexpected failures are reported to
// Sentry: not being signed in and hitting the rate limit are normal, and a
// full account is reported once, not on every retry.
let quotaReported = false
export async function uploadCheckInPhotoResult(blob: Blob): Promise<UploadResult> {
  try {
    const res = await fetch(`${getAuthBase()}/api/upload/photo?ext=jpg`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
    })
    if (res.ok) {
      const { publicUrl } = await res.json() as { publicUrl?: string }
      return publicUrl ? { ok: true, url: publicUrl } : { ok: false, reason: 'failed' }
    }
    if (res.status === 401) return { ok: false, reason: 'unauthorized' }
    if (res.status === 429) return { ok: false, reason: 'rate_limited' }
    const code = await res.json().then((b: { code?: string }) => b?.code, () => undefined)
    if (code === 'photo_quota') {
      if (!quotaReported) {
        quotaReported = true
        reportError(new Error('uploadCheckInPhoto: photo quota reached'), { area: 'sync', operation: 'upload_photo', status: res.status })
      }
      return { ok: false, reason: 'quota' }
    }
    reportError(new Error(`uploadCheckInPhoto failed: HTTP ${res.status}`), {
      area: 'sync',
      operation: 'upload_photo',
      status: res.status,
      endpoint: '/api/upload/photo',
    })
    return { ok: false, reason: 'failed' }
  } catch (error) {
    reportError(error, { area: 'sync', operation: 'upload_photo', endpoint: '/api/upload/photo' })
    return { ok: false, reason: 'failed' }
  }
}

// The hosted URL, or null if the upload didn't go through (see above).
export async function uploadCheckInPhoto(blob: Blob): Promise<string | null> {
  const result = await uploadCheckInPhotoResult(blob)
  return result.ok ? result.url : null
}
