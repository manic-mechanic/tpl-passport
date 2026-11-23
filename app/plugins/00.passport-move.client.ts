import { loadPassportState, parseStoredPassport, savePassportState } from '~/lib/passportStorage'
import { getPhotoBlob, savePhoto } from '~/composables/usePhotoStore'
import { MOVE_DONE, MOVE_PARAM, MOVE_READY, OLD_ORIGIN, cameFromOldSite, mergeMovedPassport, readMoveData, type MoveData } from '~/lib/siteMove'
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
      const data = readMoveData(event.data)
      if (data) finish(data)
    }
    const timer = setTimeout(() => finish(null), WAIT_MS)
    window.addEventListener('message', onMessage)
    opener.postMessage({ type: MOVE_READY }, OLD_ORIGIN)
  })
}

async function importMove(data: MoveData) {
  const moved = parseStoredPassport(data.passport)
  if (!moved) throw new Error('Moved passport could not be read')
  savePassportState(mergeMovedPassport(loadPassportState(), moved.payload))
  // Photos are keyed by check-in timestamp. A photo already here wins.
  for (const { key, blob } of data.photos) {
    if (!(await getPhotoBlob(key))) await savePhoto(key, blob)
  }
}

async function receiveMove(fragment: string) {
  // window.opener is typed `any`; it's the old page's window or null.
  const opener: Window | null = window.opener

  let data: MoveData | null = null
  if (opener) {
    data = await waitForMove(opener)
  } else if (fragment && cameFromOldSite(document.referrer)) {
    // Fallback for when the new tab loses its link to the old page (iOS
    // Home Screen apps): the passport without photos, in the fragment.
    try {
      data = { passport: decodeURIComponent(fragment), photos: [] }
    } catch {
      data = null
    }
  }
  if (!data) return

  try {
    await importMove(data)
    opener?.postMessage({ type: MOVE_DONE }, OLD_ORIGIN)
  } catch (error) {
    // The old page keeps its copy and offers to try again.
    reportError(error, { area: 'persistence', operation: 'import_moved_passport' })
  }
}

export default defineNuxtPlugin(async () => {
  const url = new URL(window.location.href)
  if (url.searchParams.get(MOVE_PARAM) !== '1') return
  // The fallback carries the passport in the fragment. Take it off the URL at
  // once, so an error report can't include it, and never let the app start on
  // this URL: the router already holds it and would navigate to it, sending it
  // with the pageview. Instead, finish by loading the clean URL.
  const fragment = url.hash.slice(1)
  url.searchParams.delete(MOVE_PARAM)
  const cleanUrl = url.pathname + url.search
  window.history.replaceState(null, '', cleanUrl)
  try {
    await receiveMove(fragment)
  } finally {
    window.location.replace(cleanUrl)
  }
  // Hold the app until that load replaces this page.
  await new Promise(() => {})
})
