// Sync check-ins between the local Pinia store and the shared auth server.
// All requests use credentials: 'include' so the session cookie is sent.
// Errors are reported, but sync remains best-effort and never blocks local writes.

import { getAuthBase } from '~/lib/config'
import { reportError } from '~/lib/reportError'
import { readDuplicateOf, readServerCheckIns } from '~/lib/serverResponses'
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

// Returns null when the server couldn't be read, so callers can tell
// "no check-ins" apart from "unknown".
export async function fetchCheckIns(): Promise<PassportCheckIn[] | null> {
  try {
    const res = await fetch(`${getAuthBase()}/api/checkins`, { credentials: 'include' })
    if (!res.ok) {
      reportError(new Error(`fetchCheckIns failed: HTTP ${res.status}`), {
        area: 'sync',
        operation: 'fetch_checkins',
        status: res.status,
        endpoint: '/api/checkins',
      })
      return null
    }
    const read = readServerCheckIns(await res.json())
    if (!read) {
      reportError(new Error('fetchCheckIns: response is not a list'), {
        area: 'sync',
        operation: 'fetch_checkins',
        endpoint: '/api/checkins',
      })
      return null
    }
    // One bad row shouldn't fail the whole sync: drop it, report once.
    if (read.dropped) {
      reportError(new Error('fetchCheckIns: dropped malformed check-ins'), {
        area: 'sync',
        operation: 'fetch_checkins',
        endpoint: '/api/checkins',
        dropped: read.dropped,
      })
    }
    return read.records.map(fromServer)
  } catch (error) {
    reportError(error, {
      area: 'sync',
      operation: 'fetch_checkins',
      endpoint: '/api/checkins',
    })
    return null
  }
}

// Resolves to true when the server saved the check-in. The server keeps one
// check-in per branch per library day: if another check-in (e.g. from another
// device) already holds that day, it replies with duplicateOf and this one was
// not saved. That resolves to false, so sign-out waits until the next sync
// merges it into the kept check-in.
export async function pushCheckIn(checkIn: PassportCheckIn): Promise<boolean> {
  try {
    const res = await fetch(`${getAuthBase()}/api/checkins`, {
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
      return false
    }
    // An older server sends no body, which reads as saved.
    return !readDuplicateOf(await res.json().catch(() => null))
  } catch (error) {
    reportError(error, {
      area: 'sync',
      operation: 'push_checkin',
      endpoint: '/api/checkins',
      branchCode: checkIn.branchCode,
      timestamp: checkIn.timestamp,
    })
    return false
  }
}

// Resolves to true when the server accepted the photo URL.
export async function patchCheckInPhoto(timestamp: string, photoUri: string): Promise<boolean> {
  try {
    const res = await fetch(`${getAuthBase()}/api/checkins/${encodeURIComponent(timestamp)}`, {
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
    return res.ok
  } catch (error) {
    reportError(error, {
      area: 'sync',
      operation: 'patch_checkin_photo',
      endpoint: '/api/checkins/:timestamp',
      timestamp,
    })
    return false
  }
}

export function useCheckInSync() {
  return { fetchCheckIns, pushCheckIn, patchCheckInPhoto }
}
