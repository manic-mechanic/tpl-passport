// Sync check-ins between the local Pinia store and the shared auth server.
// All requests use credentials: 'include' so the session cookie is sent.
// Errors are swallowed — sync is best-effort and must never block local writes.

const BASE = 'https://auth.librarypassport.ca'

function fromServer(record) {
  return {
    branchCode: record.branch_code,
    timestamp: record.timestamp,
    note: record.note ?? '',
    ...(record.photo_url ? { photoUri: record.photo_url, hasPhoto: true } : {}),
  }
}

function toServer(checkIn) {
  return {
    branchCode: checkIn.branchCode,
    timestamp: checkIn.timestamp,
    note: checkIn.note ?? '',
    ...(checkIn.photoUri ? { photoUri: checkIn.photoUri } : {}),
  }
}

export async function fetchCheckIns() {
  try {
    const res = await fetch(`${BASE}/api/checkins`, { credentials: 'include' })
    if (!res.ok) return []
    return (await res.json()).map(fromServer)
  } catch {
    return []
  }
}

export async function pushCheckIn(checkIn) {
  try {
    await fetch(`${BASE}/api/checkins`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toServer(checkIn)),
    })
  } catch { /* fire-and-forget */ }
}

export async function patchCheckInPhoto(timestamp, photoUri) {
  try {
    await fetch(`${BASE}/api/checkins/${encodeURIComponent(timestamp)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUri }),
    })
  } catch { /* fire-and-forget */ }
}

export function useCheckInSync() {
  return { fetchCheckIns, pushCheckIn, patchCheckInPhoto }
}
