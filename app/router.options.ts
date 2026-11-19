import type { RouterConfig } from 'nuxt/schema'
import type { RouteLocationNormalized } from 'vue-router'
import { START_LOCATION } from 'vue-router'
import { isChangingPage } from '#app/components/utils'
import { consumePopNavigation, currentHistoryEntry, getAppScroller, markShownEntry, savedTopFor } from '~/lib/appScroller'

// Nuxt's default scroll behaviour (nuxt/dist/pages/runtime/router.options),
// extended for the installed app, where pages scroll inside #__nuxt rather
// than the window (see ~/lib/appScroller). In a browser tab this returns the
// same positions as Nuxt's default and Vue Router scrolls the window. In the
// installed app it scrolls #__nuxt itself, restoring the position saved for
// the history entry on back/forward, and returns false.
//
// One change from Nuxt's default in both modes: a hash with no matching
// element (e.g. /passport#extra-credit, which picks a tab rather than an
// anchor) scrolls to the top instead of leaving the previous page's offset.

type Position = { left?: number, top?: number, el?: string, behavior?: ScrollBehavior }
type ScrollResult = Position | false

function hashTarget(hash: string): HTMLElement | null {
  return document.getElementById(decodeURIComponent(hash.slice(1)))
}

function hashMarginTop(hash: string): number {
  const elem = hashTarget(hash)
  if (!elem) return 0
  return (Number.parseFloat(getComputedStyle(elem).scrollMarginTop) || 0)
    + (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
}

function calculatePosition(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: Position | null,
  hashBehavior: ScrollBehavior,
): Position {
  if (savedPosition) return savedPosition
  if (to.hash && hashTarget(to.hash)) {
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
    const target = hashTarget(result.el)
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

    const entry = currentHistoryEntry()
    // Back/forward in the installed app restores #__nuxt's saved scroll.
    // Vue Router's savedPosition can't say "restore" here: it is the
    // window's, and it isn't recorded at all until Nuxt switches
    // history.scrollRestoration to manual partway into the first
    // navigations. So go by our own popstate flag.
    const isPop = consumePopNavigation(entry)
    let saved: Position | null = savedPosition
    if (getAppScroller()) {
      const top = isPop ? savedTopFor(entry) : undefined
      saved = top === undefined ? null : { left: 0, top }
    }

    // The page for this entry is on screen from here, and its scroll has
    // been set; from now on, scrolling belongs to this entry.
    const finish = (result: ScrollResult): ScrollResult => {
      const applied = apply(result)
      markShownEntry(entry)
      return applied
    }

    if (to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')) {
      if (from.hash && !to.hash) return finish(saved ?? { left: 0, top: 0 })
      if (to.hash) return finish({ el: to.hash, top: hashMarginTop(to.hash), behavior: hashBehavior })
      return finish(false)
    }

    const scrollToTop = typeof to.meta.scrollToTop === 'function' ? to.meta.scrollToTop(to, from) : to.meta.scrollToTop
    if (scrollToTop === false) return finish(false)

    if (from === START_LOCATION) return finish(calculatePosition(to, from, saved, hashBehavior))

    return new Promise<ScrollResult>((resolve) => {
      const doScroll = () => {
        requestAnimationFrame(() => {
          // A newer navigation took over; it marks its own entry.
          if (router.currentRoute.value.fullPath !== to.fullPath) {
            resolve(false)
            return
          }
          resolve(finish(calculatePosition(to, from, saved, hashBehavior)))
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
