// One place for reading the user's location, shared by Explore and Check-in.
//
// iPhone Safari (and the installed home-screen app) forgets a location
// "Allow" quickly, so every getCurrentPosition() call can bring the prompt
// back. To keep prompts down:
//   - a recent position is reused for NEARBY_MAX_AGE_MS, across pages and
//     reloads within the session, instead of asking again;
//   - calls made at the same time with the same timeout share one request;
//   - pages call locationAccess() first and only ask on page load when
//     access is granted; otherwise they wait for a tap.
//
// Safari often reports "prompt" even for a site the user has allowed, so a
// successful fix is remembered on the device and counts as granted later.

export interface Coords {
  latitude: number
  longitude: number
}

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unknown'

// Good enough for "which branch is nearest" and the Near Me list.
export const NEARBY_MAX_AGE_MS = 5 * 60 * 1000

const STORAGE_KEY = 'tpl-passport:last-position'
const ALLOWED_KEY = 'tpl-passport:location-allowed'

interface Cached extends Coords {
  at: number
}

let memory: Cached | null = null
// Keyed by timeout, so a caller never waits longer than it asked to.
const inFlight = new Map<number, Promise<Coords>>()

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
  const timeout = opts.timeout ?? 10000
  const pending = inFlight.get(timeout)
  if (pending) return pending
  const geo = globalThis.navigator?.geolocation
  if (!geo) return Promise.reject(new Error('Geolocation not available'))
  const request = new Promise<Coords>((resolve, reject) => {
    geo.getCurrentPosition(
      (pos) => {
        const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
        store({ ...c, at: Date.now() })
        rememberAllowed(true)
        resolve(c)
      },
      (err) => {
        if (err?.code === 1) rememberAllowed(false)
        reject(err)
      },
      { timeout },
    )
  }).finally(() => { inFlight.delete(timeout) })
  inFlight.set(timeout, request)
  return request
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

function rememberAllowed(allowed: boolean) {
  try {
    if (allowed) globalThis.localStorage?.setItem(ALLOWED_KEY, '1')
    else globalThis.localStorage?.removeItem(ALLOWED_KEY)
  } catch { /* storage blocked: we just ask on tap */ }
}

function wasAllowed(): boolean {
  try {
    return globalThis.localStorage?.getItem(ALLOWED_KEY) === '1'
  } catch {
    return false
  }
}

export type LocationAccess = 'granted' | 'denied' | 'unknown' | 'unavailable'

// What a page can expect from asking, without asking. 'granted' includes a
// device that has given a location before, even if the browser now reports
// "prompt" (Safari): asking on load is then expected, not a surprise.
export async function locationAccess(): Promise<LocationAccess> {
  if (!globalThis.navigator?.geolocation) return 'unavailable'
  const permission = await locationPermission()
  if (permission === 'granted' || permission === 'denied') return permission
  return wasAllowed() ? 'granted' : 'unknown'
}

// Where to turn location back on, for the "denied" message.
export function locationSettingsHint(userAgent: string, isTouchMac = false): string {
  if (/iPhone|iPad|iPod/.test(userAgent) || isTouchMac) {
    return 'Turn it on in Settings › Apps › Safari › Location.'
  }
  return "Allow it in your browser's site settings."
}

// Test-only: forget the cached position.
export function _resetLocationCache() {
  memory = null
  inFlight.clear()
  try { globalThis.sessionStorage?.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  try { globalThis.localStorage?.removeItem(ALLOWED_KEY) } catch { /* ignore */ }
}
