import type { PassportCheckIn } from '~/types/passport'

// IndexedDB-backed photo storage for check-in photos.
// Keyed by check-in timestamp string (ISO 8601) — matches the timestamp
// stored in the Pinia checkIns array, so no extra ID needed.
//
// Signed-in users also get a hosted copy via /api/upload/photo on the auth server.
// That copy's URL is the check-in's photoUri, which is how a photo taken on
// another device (or before this device was signed out) is shown.

const DB_NAME    = 'tpl-passport-photos'
const STORE_NAME = 'photos'
const DB_VERSION = 1

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => {
      _db = request.result
      resolve(_db)
    }
    request.onerror = () => reject(request.error)
  })
}

// Store a photo Blob under the given key.
export async function savePhoto(key: string, blob: Blob): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(blob, key)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

// Returns an object URL for the stored photo, or null if none exists.
// Caller is responsible for revoking the URL when done (URL.revokeObjectURL).
export async function getPhotoUrl(key: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => {
      const blob = request.result as Blob | undefined
      resolve(blob ? URL.createObjectURL(blob) : null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deletePhoto(key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

// Remove every stored photo (used on sign-out).
export async function clearPhotos(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

// Returns the stored photo Blob, or null if none exists.
export async function getPhotoBlob(key: string): Promise<Blob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null)
    request.onerror   = () => reject(request.error)
  })
}

// Re-keys a stored photo (used when a duplicate check-in is merged into another).
export async function movePhoto(fromKey: string, toKey: string): Promise<void> {
  const blob = await getPhotoBlob(fromKey)
  if (!blob) return
  await savePhoto(toKey, blob)
  await deletePhoto(fromKey)
}

// The image src for a check-in's photo: this device's copy when it has one,
// otherwise the hosted copy, or null when there's no photo. A device copy is
// an object URL; pass it to releasePhotoSrc when done.
export async function getCheckInPhotoSrc(checkIn: Pick<PassportCheckIn, 'timestamp' | 'photoUri'>): Promise<string | null> {
  try {
    const local = await getPhotoUrl(checkIn.timestamp)
    if (local) return local
  } catch {
    // IndexedDB unavailable (e.g. some private modes): fall back to the hosted copy.
  }
  return checkIn.photoUri || null
}

export function releasePhotoSrc(src: string | null | undefined): void {
  if (src?.startsWith('blob:')) URL.revokeObjectURL(src)
}
