import { currentHistoryEntry, markShownEntry, saveShownEntryScroll } from '~/lib/appScroller'

// In the installed app the page scrolls inside #__nuxt, not the window (see
// ~/lib/appScroller). Save that scroll before each navigation so back and
// forward can restore it (app/router.options.ts).
export default defineNuxtPlugin(() => {
  const router = useRouter()
  markShownEntry(currentHistoryEntry())
  router.beforeEach(() => {
    saveShownEntryScroll()
  })
})
