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

// Uploads a compressed photo and returns its hosted URL, or null on failure.
// A 401 just means the user isn't signed in, so it isn't reported.
export async function uploadCheckInPhoto(blob: Blob): Promise<string | null> {
  try {
    const res = await fetch(`${getAuthBase()}/api/upload/photo?ext=jpg`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
    })
    if (!res.ok) {
      if (res.status !== 401) {
        reportError(new Error(`uploadCheckInPhoto failed: HTTP ${res.status}`), {
          area: 'sync',
          operation: 'upload_photo',
          status: res.status,
          endpoint: '/api/upload/photo',
        })
      }
      return null
    }
    const { publicUrl } = await res.json() as { publicUrl?: string }
    return publicUrl || null
  } catch (error) {
    reportError(error, { area: 'sync', operation: 'upload_photo', endpoint: '/api/upload/photo' })
    return null
  }
}
