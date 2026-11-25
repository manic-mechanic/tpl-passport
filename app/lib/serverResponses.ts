// Checks on JSON from the auth server before it's used. A malformed body (a
// deploy mismatch with tpl-passport-auth, a proxy error page) should fail
// here, next to the request, not get saved into the passport and synced.
import type { ServerCheckInRecord } from '~/types/passport'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const optionalText = (value: unknown) => value == null || typeof value === 'string'

export function isServerCheckIn(value: unknown): value is ServerCheckInRecord {
  return isObject(value)
    && typeof value.branch_code === 'string' && value.branch_code !== ''
    && typeof value.timestamp === 'string' && value.timestamp !== ''
    && optionalText(value.note)
    && optionalText(value.photo_url)
}

// GET /api/checkins. Null when the body isn't a list at all (treated like a
// failed request); otherwise the valid records, and how many were dropped.
export function readServerCheckIns(body: unknown): { records: ServerCheckInRecord[], dropped: number } | null {
  if (!Array.isArray(body)) return null
  const records = body.filter(isServerCheckIn)
  return { records, dropped: body.length - records.length }
}

// GET /api/profile. Null when the body isn't an object; a field that isn't
// a string reads as ''.
export function readServerProfile(body: unknown): { name: string, homeBranch: string } | null {
  if (!isObject(body)) return null
  return {
    name: typeof body.name === 'string' ? body.name : '',
    homeBranch: typeof body.home_branch === 'string' ? body.home_branch : '',
  }
}

// POST /api/upload/photo. The hosted URL, only if it's an https URL.
export function readPublicUrl(body: unknown): string | null {
  if (!isObject(body) || typeof body.publicUrl !== 'string') return null
  try {
    return new URL(body.publicUrl).protocol === 'https:' ? body.publicUrl : null
  } catch {
    return null
  }
}

// POST /api/checkins. True when the server says another check-in already
// holds that branch and day (and this one wasn't saved).
export function readDuplicateOf(body: unknown): boolean {
  return isObject(body) && typeof body.duplicateOf === 'string' && body.duplicateOf !== ''
}
