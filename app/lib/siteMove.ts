import type { PassportCheckIn, PassportPersistedState } from '~/types/passport'

// Moving passports off the old site address.
//
// tpl-passport.vercel.app was a second production address. Browsers keep a
// site's storage per address, and sign-in never worked there, so people who
// used it have their passport only in that browser storage. A plain redirect
// would strand it. Instead, the old address shows public/moving.html, which
// opens the new site and hands its stored passport and photos over with
// postMessage. app/plugins/00.passport-move.client.ts receives them here.
//
// Message flow (each side checks the other's exact origin):
//   new site -> old: { type: READY }
//   old -> new site: { type: DATA, passport: <raw stored passport>, photos: [{ key, blob }] }
//   new site -> old: { type: DONE }
// If the new tab can't talk back (it loses window.opener, as iOS Home Screen
// apps may), moving.html can instead send the passport without photos in the
// fragment of a same-tab link, accepted only from the old address.
// public/moving.html repeats these names; keep them in step.

export const OLD_ORIGIN = 'https://tpl-passport.vercel.app'
export const NEW_ORIGIN = 'https://www.librarypassport.ca'
export const MOVE_PARAM = 'passport-move'
// The fallback's fragment, moved here by an inline <head> script (see
// nuxt.config.ts) before any app code, Sentry included, can see the URL.
export const MOVE_FRAGMENT_KEY = 'tpl-passport-move-fragment'
// Sent back to the old page when the fallback can't be accepted, so the
// person isn't left on an empty passport without knowing why.
export const MOVE_FAILED_URL = `${OLD_ORIGIN}/moving.html?failed=1`
// A finished move, kept across the reload so it can be counted once
// analytics has loaded (the move itself runs before it does).
export const MOVED_EVENT_KEY = 'tpl-passport-moved-event'

// The `passport_moved` analytics event's properties.
export interface MovedEvent {
  method: 'one_tap' | 'without_photos'
  visits: number
  photos: number
}

export function parseMovedEvent(raw: string | null): MovedEvent | null {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null
    if (!isObject(value)) return null
    const { method, visits, photos } = value
    if ((method !== 'one_tap' && method !== 'without_photos') || typeof visits !== 'number' || typeof photos !== 'number') return null
    return { method, visits, photos }
  } catch {
    return null
  }
}

export const MOVE_READY = 'tpl-passport-move:ready'
export const MOVE_DATA = 'tpl-passport-move:data'
export const MOVE_DONE = 'tpl-passport-move:done'

export interface MovedPhoto {
  key: string
  blob: Blob
}

export interface MoveData {
  passport: string
  photos: MovedPhoto[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

// The type of a move message, or null for anything else.
export function moveMessageType(data: unknown): string | null {
  return isObject(data) && typeof data.type === 'string' ? data.type : null
}

// Validates a DATA message from the old site. Malformed photo entries are
// dropped rather than failing the whole move.
export function readMoveData(data: unknown): MoveData | null {
  if (!isObject(data) || data.type !== MOVE_DATA || typeof data.passport !== 'string') return null
  const photos = Array.isArray(data.photos)
    ? data.photos.filter((p): p is MovedPhoto =>
      isObject(p) && typeof p.key === 'string' && p.blob instanceof Blob)
    : []
  return { passport: data.passport, photos }
}

// The fallback move puts the passport in a link, so any site could build one.
// Only accept it on a visit that came from the old address; browsers set the
// referrer, so another site can't claim to be it.
export function cameFromOldSite(referrer: string): boolean {
  try {
    return new URL(referrer).origin === OLD_ORIGIN
  } catch {
    return false
  }
}

// Whether a passport holds anything the person made, as opposed to the
// defaults every first visit stores.
export function hasPassportData(state: Partial<PassportPersistedState>): boolean {
  const profile = state.profile ?? {}
  return (state.checkIns?.length ?? 0) > 0
    || (state.completedChallenges?.length ?? 0) > 0
    || !!(profile.name || profile.homeBranch || profile.favouriteBook)
}

const checkInKey = (c: PassportCheckIn) => `${c.branchCode}|${c.timestamp}`

const timestampMs = (value: string) => {
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? 0 : ms
}

// Combines the passport already on the new site with the one moved from the
// old address. Nothing is dropped: check-ins and challenges are unioned (the
// new site's copy wins on an exact duplicate). If the new site's passport is
// still untouched, the moved profile and identity are taken whole; otherwise
// the new site's profile is kept and only its blank fields are filled in.
export function mergeMovedPassport(
  current: Partial<PassportPersistedState>,
  moved: PassportPersistedState,
): PassportPersistedState {
  const currentCheckIns = current.checkIns ?? []
  const seen = new Set(currentCheckIns.map(checkInKey))
  const checkIns = [...currentCheckIns, ...moved.checkIns.filter(c => !seen.has(checkInKey(c)))]
    // Newest first, as the store keeps them.
    .sort((a, b) => timestampMs(b.timestamp) - timestampMs(a.timestamp))

  const completedChallenges = [...new Set([...(current.completedChallenges ?? []), ...moved.completedChallenges])]

  if (!hasPassportData(current)) {
    return {
      anonymousId: moved.anonymousId ?? current.anonymousId,
      checkIns,
      profile: { ...current.profile, ...moved.profile },
      completedChallenges,
    }
  }

  const profile = { ...current.profile }
  for (const field of ['name', 'homeBranch', 'favouriteBook'] as const) {
    if (!profile[field] && moved.profile[field]) profile[field] = moved.profile[field]
  }
  return { anonymousId: current.anonymousId ?? moved.anonymousId, checkIns, profile, completedChallenges }
}
