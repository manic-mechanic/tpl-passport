import type { RouterConfig } from 'nuxt/schema'
import type { RouteLocationNormalized } from 'vue-router'
import { START_LOCATION } from 'vue-router'
import { currentHistoryEntry, getAppScroller, markShownEntry, savedTopFor } from '~/lib/appScroller'

// Nuxt's default scroll behaviour (nuxt/dist/pages/runtime/router.options),
// extended for the installed app, where pages scroll inside #__nuxt rather
// than the window (see ~/lib/appScroller). In a browser tab this returns the
// same positions as Nuxt's default and Vue Router scrolls the window. In the
// installed app it scrolls #__nuxt itself, restoring the position saved for
// the history entry on back/forward, and returns false.

type Position = { left?: number, top?: number, el?: string, behavior?: ScrollBehavior }
type ScrollResult = Position | false

function hashMarginTop(hash: string): number {
  const elem = document.getElementById(hash.slice(1))
  if (!elem) return 0
  return (Number.parseFloat(getComputedStyle(elem).scrollMarginTop) || 0)
    + (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
}

function isChangingPage(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  return to.path !== from.path
}

function calculatePosition(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: Position | null,
  hashBehavior: ScrollBehavior,
): Position {
  if (savedPosition) return savedPosition
  if (to.hash) {
    return {
      el: to.hash,
      top: hashMarginTop(to.hash),
      behavior: isChangingPage(to, from) ? hashBehavior : 'instant',
    }
  }
  return { left: 0, top: 0 }
}

// Apply a position to #__nuxt when it is the scroller; otherwise hand it to
// Vue Router to apply to the window.
function apply(result: ScrollResult): ScrollResult {
  const scroller = getAppScroller()
  if (!scroller || result === false) return result
  if (result.el) {
    const target = document.querySelector(result.el)
    if (target) {
      const offset = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top
      scroller.scrollTo({ top: scroller.scrollTop + offset - (result.top ?? 0), behavior: result.behavior })
    }
  } else {
    scroller.scrollTo({ top: result.top ?? 0, behavior: result.behavior ?? 'instant' })
  }
  return false
}

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    const nuxtApp = useNuxtApp()
    const router = useRouter()
    const hashBehavior = (router.options as { scrollBehaviorType?: ScrollBehavior }).scrollBehaviorType ?? 'auto'

    // The page now on screen belongs to this history entry.
    const entry = currentHistoryEntry()
    markShownEntry(entry)
    // Vue Router's savedPosition is the window's, which doesn't move in the
    // installed app; use #__nuxt's saved scroll instead. savedPosition is
    // only set on back/forward, so that is still what says "restore".
    let saved: Position | null = savedPosition
    if (savedPosition && getAppScroller()) saved = { left: 0, top: savedTopFor(entry) ?? 0 }

    if (to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')) {
      if (from.hash && !to.hash) return apply(saved ?? { left: 0, top: 0 })
      if (to.hash) return apply({ el: to.hash, top: hashMarginTop(to.hash), behavior: hashBehavior })
      return false
    }

    const scrollToTop = typeof to.meta.scrollToTop === 'function' ? to.meta.scrollToTop(to, from) : to.meta.scrollToTop
    if (scrollToTop === false) return false

    if (from === START_LOCATION) return apply(calculatePosition(to, from, saved, hashBehavior))

    return new Promise<ScrollResult>((resolve) => {
      const doScroll = () => {
        requestAnimationFrame(() => {
          if (router.currentRoute.value.fullPath !== to.fullPath) {
            resolve(false)
            return
          }
          resolve(apply(calculatePosition(to, from, saved, hashBehavior)))
        })
      }
      nuxtApp.hooks.hookOnce('page:loading:end', () => {
        const transitionPromise = (nuxtApp as unknown as { '~transitionPromise'?: Promise<void> })['~transitionPromise']
        if (transitionPromise) transitionPromise.then(doScroll)
        else doScroll()
      })
    })
  },
}
