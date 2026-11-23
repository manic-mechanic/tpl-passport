import { loadPassportState, parseStoredPassport, savePassportState } from '~/lib/passportStorage'
import { getPhotoBlob, savePhoto } from '~/composables/usePhotoStore'
import {
  MOVED_EVENT_KEY, MOVE_DATA, MOVE_DONE, MOVE_FAILED_URL, MOVE_FRAGMENT_KEY, MOVE_PARAM, MOVE_READY, OLD_ORIGIN,
  cameFromOldSite, mergeMovedPassport, moveMessageType, parseMovedEvent, readMoveData, type MoveData, type MovedEvent,
} from '~/lib/siteMove'
import { reportError } from '~/lib/reportError'

// Receives a passport moved from the old site address (see lib/siteMove.ts).
// Runs before every other plugin, and the app waits for it, so the moved
// passport is saved before the passport store first reads storage.

// The old page answers straight away; this only covers it never answering.
const WAIT_MS = 15_000

function waitForMove(opener: Window): Promise<MoveData | null> {
  return new Promise((resolve) => {
    const finish = (data: MoveData | null) => {
      window.removeEventListener('message', onMessage)
      clearTimeout(timer)
      resolve(data)
    }
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== OLD_ORIGIN || event.source !== opener) return
      // A malformed DATA message is final too: nothing better is coming.
      if (moveMessageType(event.data) === MOVE_DATA) finish(readMoveData(event.data))
    }
    const timer = setTimeout(() => finish(null), WAIT_MS)
    window.addEventListener('message', onMessage)
    opener.postMessage({ type: MOVE_READY }, OLD_ORIGIN)
  })
}

// Returns how many visits and photos moved.
async function importMove(data: MoveData): Promise<{ visits: number, photos: number }> {
  const moved = parseStoredPassport(data.passport)
  if (!moved) throw new Error('Moved passport could not be read')
  // Photos first: if one fails, nothing points at it yet, and a retry skips
  // the ones already saved. Keyed by check-in timestamp; a photo already
  // here wins.
  let photos = 0
  for (const { key, blob } of data.photos) {
    if (await getPhotoBlob(key)) continue
    await savePhoto(key, blob)
    photos++
  }
  savePassportState(mergeMovedPassport(loadPassportState(), moved.payload))
  return { visits: moved.payload.checkIns.length, photos }
}

function rememberMovedEvent(event: MovedEvent) {
  try {
    sessionStorage.setItem(MOVED_EVENT_KEY, JSON.stringify(event))
  } catch {
    // Only the count is lost.
  }
}

function takeMovedEvent(): MovedEvent | null {
  try {
    const event = parseMovedEvent(sessionStorage.getItem(MOVED_EVENT_KEY))
    sessionStorage.removeItem(MOVED_EVENT_KEY)
    return event
  } catch {
    return null
  }
}

// The fallback's fragment, stashed by the inline <head> script in
// nuxt.config.ts. Read once.
function takeFragment(): string {
  try {
    const fragment = sessionStorage.getItem(MOVE_FRAGMENT_KEY) ?? ''
    sessionStorage.removeItem(MOVE_FRAGMENT_KEY)
    return fragment
  } catch {
    return ''
  }
}

// Returns where to go next: the clean URL, or back to the old page when a
// fallback move can't be accepted.
async function receiveMove(cleanUrl: string): Promise<string> {
  // window.opener is typed `any`; it's the old page's window or null.
  const opener: Window | null = window.opener
  const fragment = takeFragment()
  const referrer = document.referrer

  let data: MoveData | null = null
  if (fragment) {
    // Fallback for when the new tab loses its link to the old page (iOS
    // Home Screen apps): the passport without photos, in the fragment.
    if (!cameFromOldSite(referrer)) return MOVE_FAILED_URL
    try {
      data = { passport: decodeURIComponent(fragment), photos: [] }
    } catch {
      return MOVE_FAILED_URL
    }
  } else if (opener && (!referrer || cameFromOldSite(referrer))) {
    // Some browsers send no referrer, so only a referrer from another site
    // rules the old page out. Anything else waits for it to answer.
    data = await waitForMove(opener)
  }
  if (!data) return cleanUrl

  try {
    const counts = await importMove(data)
    rememberMovedEvent({ method: opener ? 'one_tap' : 'without_photos', ...counts })
    opener?.postMessage({ type: MOVE_DONE }, OLD_ORIGIN)
  } catch (error) {
    // The old page keeps its copy and offers to try again.
    reportError(error, { area: 'persistence', operation: 'import_moved_passport' })
    if (!opener) return MOVE_FAILED_URL
  }
  return cleanUrl
}

export default defineNuxtPlugin(async (nuxtApp) => {
  const url = new URL(window.location.href)
  if (url.searchParams.get(MOVE_PARAM) !== '1') {
    // The load after a move: count it once analytics is up.
    const moved = takeMovedEvent()
    if (moved) onNuxtReady(() => nuxtApp.$posthog?.capture('passport_moved', { ...moved }))
    return
  }
  // Never let the app start on this URL: the router already holds it and
  // would navigate to it and send it with the pageview. Finish by loading
  // the clean URL instead.
  url.searchParams.delete(MOVE_PARAM)
  url.hash = ''
  const cleanUrl = url.pathname + url.search
  let next = cleanUrl
  try {
    next = await receiveMove(cleanUrl)
  } finally {
    window.location.replace(next)
  }
  // Hold the app until that load replaces this page.
  await new Promise(() => {})
})
