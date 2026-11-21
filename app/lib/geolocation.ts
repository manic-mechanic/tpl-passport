// One place for reading the user's location, shared by Explore and Check-in.
//
// iPhone Safari (and the installed home-screen app) forgets a location
// "Allow" quickly, so every getCurrentPosition() call can bring the prompt
// back. To keep prompts down:
//   - a recent position is reused for NEARBY_MAX_AGE_MS, across pages and
//     reloads within the session, instead of asking again;
//   - two calls made at the same time share one request;
//   - pages call locationPermission() first and only ask on page load when
//     access is already granted; otherwise they wait for a tap.

export interface Coords {
  latitude: number
  longitude: number
}

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unknown'

// Good enough for "which branch is nearest" and the Near Me list.
export const NEARBY_MAX_AGE_MS = 5 * 60 * 1000

const STORAGE_KEY = 'tpl-passport:last-position'

interface Cached extends Coords {
  at: number
}

let memory: Cached | null = null
let inFlight: Promise<Coords> | null = null

function readStored(): Cached | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (typeof v?.latitude === 'number' && typeof v?.longitude === 'number' && typeof v?.at === 'number') {
      return v
    }
  } catch { /* storage blocked or bad JSON */ }
  return null
}

function store(c: Cached) {
  memory = c
  try {
    globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(c))
  } catch { /* storage blocked: memory copy still works */ }
}

// The last known position if it is no older than maxAgeMs, else null.
// Never prompts.
export function cachedPosition(maxAgeMs = NEARBY_MAX_AGE_MS, now = Date.now()): (Coords & { ageMs: number }) | null {
  const c = memory ?? readStored()
  if (!c) return null
  memory = c
  const ageMs = now - c.at
  if (ageMs < 0 || ageMs > maxAgeMs) return null
  return { latitude: c.latitude, longitude: c.longitude, ageMs }
}

// A fresh position from the browser. May show the permission prompt.
// Rejects with the browser's GeolocationPositionError (code 1 denied,
// 3 timeout), or with an Error when geolocation is not available.
export function freshPosition(opts: { timeout?: number } = {}): Promise<Coords> {
  if (inFlight) return inFlight
  const geo = globalThis.navigator?.geolocation
  if (!geo) return Promise.reject(new Error('Geolocation not available'))
  inFlight = new Promise<Coords>((resolve, reject) => {
    geo.getCurrentPosition(
      (pos) => {
        const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
        store({ ...c, at: Date.now() })
        resolve(c)
      },
      reject,
      { timeout: opts.timeout ?? 10000 },
    )
  }).finally(() => { inFlight = null })
  return inFlight
}

// A cached position when one is recent enough, else a fresh one.
export function getPosition(opts: { maxAgeMs?: number, timeout?: number } = {}): Promise<Coords> {
  const cached = cachedPosition(opts.maxAgeMs ?? NEARBY_MAX_AGE_MS)
  if (cached) return Promise.resolve({ latitude: cached.latitude, longitude: cached.longitude })
  return freshPosition({ timeout: opts.timeout })
}

// The browser's location permission, without prompting. 'unknown' when the
// Permissions API is missing or fails; treat it like 'prompt'.
export async function locationPermission(): Promise<LocationPermission> {
  try {
    const status = await globalThis.navigator?.permissions?.query({ name: 'geolocation' as PermissionName })
    const s = status?.state
    return s === 'granted' || s === 'denied' || s === 'prompt' ? s : 'unknown'
  } catch {
    return 'unknown'
  }
}

// Test-only: forget the cached position.
export function _resetLocationCache() {
  memory = null
  inFlight = null
  try { globalThis.sessionStorage?.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}
