// IndexedDB-backed photo storage for check-in photos.
// Keyed by check-in timestamp string (ISO 8601) — matches the timestamp
// stored in the Pinia checkIns array, so no extra ID needed.
//
// Signed-in users also get a hosted copy via /api/upload/photo on the auth server.

const DB_NAME    = 'tpl-passport-photos'
const STORE_NAME = 'photos'
const DB_VERSION = 1

let _db = null

function openDB() {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = (e) => {
      _db = e.target.result
      resolve(_db)
    }
    request.onerror = (e) => reject(e.target.error)
  })
}

// Store a photo Blob under the given key.
export async function savePhoto(key, blob) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(blob, key)
    tx.oncomplete = resolve
    tx.onerror    = (e) => reject(e.target.error)
  })
}

// Returns an object URL for the stored photo, or null if none exists.
// Caller is responsible for revoking the URL when done (URL.revokeObjectURL).
export async function getPhotoUrl(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = (e) => {
      const blob = e.target.result
      resolve(blob ? URL.createObjectURL(blob) : null)
    }
    request.onerror = (e) => reject(e.target.error)
  })
}

export async function deletePhoto(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = resolve
    tx.onerror    = (e) => reject(e.target.error)
  })
}

// Remove every stored photo (used on sign-out).
export async function clearPhotos() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = resolve
    tx.onerror    = (e) => reject(e.target.error)
  })
}

// Returns the stored photo Blob, or null if none exists.
export async function getPhotoBlob(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
    request.onsuccess = (e) => resolve(e.target.result ?? null)
    request.onerror   = (e) => reject(e.target.error)
  })
}

// Re-keys a stored photo (used when a duplicate check-in is merged into another).
export async function movePhoto(fromKey, toKey) {
  const blob = await getPhotoBlob(fromKey)
  if (!blob) return
  await savePhoto(toKey, blob)
  await deletePhoto(fromKey)
}
