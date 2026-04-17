// Sync check-ins between the local Pinia store and the shared auth server.
// All requests use credentials: 'include' so the session cookie is sent.
// Errors are reported, but sync remains best-effort and never blocks local writes.

import { AUTH_BASE as BASE } from '~/lib/config'
import { reportError } from '~/lib/reportError'
import type { PassportCheckIn, ServerCheckInPayload, ServerCheckInRecord } from '~/types/passport'

function fromServer(record: ServerCheckInRecord): PassportCheckIn {
  return {
    branchCode: record.branch_code,
    timestamp: record.timestamp,
    note: record.note ?? '',
    ...(record.photo_url ? { photoUri: record.photo_url, hasPhoto: true } : {}),
  }
}

function toServer(checkIn: PassportCheckIn): ServerCheckInPayload {
  return {
    branchCode: checkIn.branchCode,
    timestamp: checkIn.timestamp,
    note: checkIn.note ?? '',
    ...(checkIn.photoUri ? { photoUri: checkIn.photoUri } : {}),
  }
}

export async function fetchCheckIns(): Promise<PassportCheckIn[]> {
  try {
    const res = await fetch(`${BASE}/api/checkins`, { credentials: 'include' })
    if (!res.ok) {
      reportError(new Error(`fetchCheckIns failed: HTTP ${res.status}`), {
        area: 'sync',
        operation: 'fetch_checkins',
        status: res.status,
        endpoint: '/api/checkins',
      })
      return []
    }
    const data = await res.json() as ServerCheckInRecord[]
    return data.map(fromServer)
  } catch (error) {
    reportError(error, {
      area: 'sync',
      operation: 'fetch_checkins',
      endpoint: '/api/checkins',
    })
    return []
  }
}

export async function pushCheckIn(checkIn: PassportCheckIn): Promise<void> {
  try {
    const res = await fetch(`${BASE}/api/checkins`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toServer(checkIn)),
    })
    if (!res.ok) {
      reportError(new Error(`pushCheckIn failed: HTTP ${res.status}`), {
        area: 'sync',
        operation: 'push_checkin',
        status: res.status,
        endpoint: '/api/checkins',
        branchCode: checkIn.branchCode,
        timestamp: checkIn.timestamp,
      })
    }
  } catch (error) {
    reportError(error, {
      area: 'sync',
      operation: 'push_checkin',
      endpoint: '/api/checkins',
      branchCode: checkIn.branchCode,
      timestamp: checkIn.timestamp,
    })
  }
}

export async function patchCheckInPhoto(timestamp: string, photoUri: string): Promise<void> {
  try {
    const res = await fetch(`${BASE}/api/checkins/${encodeURIComponent(timestamp)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUri }),
    })
    if (!res.ok) {
      reportError(new Error(`patchCheckInPhoto failed: HTTP ${res.status}`), {
        area: 'sync',
        operation: 'patch_checkin_photo',
        status: res.status,
        endpoint: '/api/checkins/:timestamp',
        timestamp,
      })
    }
  } catch (error) {
    reportError(error, {
      area: 'sync',
      operation: 'patch_checkin_photo',
      endpoint: '/api/checkins/:timestamp',
      timestamp,
    })
  }
}

export function useCheckInSync() {
  return { fetchCheckIns, pushCheckIn, patchCheckInPhoto }
}
