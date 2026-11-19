import { currentHistoryEntry, markShownEntry, notePopNavigation, saveShownEntryScroll } from '~/lib/appScroller'

// In the installed app the page scrolls inside #__nuxt, not the window (see
// ~/lib/appScroller). Save that scroll before each navigation, and flag
// back/forward, so app/router.options.ts can restore it.
export default defineNuxtPlugin(() => {
  const router = useRouter()
  markShownEntry(currentHistoryEntry())
  window.addEventListener('popstate', notePopNavigation)
  router.beforeEach(() => {
    saveShownEntryScroll()
  })
})
