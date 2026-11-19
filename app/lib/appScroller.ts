// Which element scrolls the app's pages.
//
// In a browser tab the document scrolls, as usual. In the installed app
// (html.standalone) the document is pinned to the screen and
// #__nuxt scrolls instead, so iOS bounces #__nuxt rather than revealing the
// navy root background past the bottom of a page (see main.css, "Installed
// app scrolling"). The CSS decides; this just reads which one it chose.

export function getAppScroller(): HTMLElement | null {
  const root = document.getElementById('__nuxt')
  if (!root) return null
  const overflowY = getComputedStyle(root).overflowY
  return overflowY === 'auto' || overflowY === 'scroll' ? root : null
}

/** Scroll whichever element scrolls the app's pages. */
export function scrollAppTo(options: ScrollToOptions) {
  const scroller = getAppScroller()
  if (scroller) scroller.scrollTo(options)
  else window.scrollTo(options)
}

// Vue Router saves and restores window scroll for back/forward on its own,
// but knows nothing about #__nuxt. These remember #__nuxt's scroll per
// history entry (keyed by Vue Router's history.state.position) for the
// router's scrollBehavior to restore. In-memory only: a reload starts at
// the top.
const savedTops = new Map<number, number>()
let shownEntry: number | null = null

export function currentHistoryEntry(): number | null {
  const position = (window.history.state as { position?: unknown } | null)?.position
  return typeof position === 'number' ? position : null
}

/** Record the history entry now on screen (called when its page is shown). */
export function markShownEntry(entry: number | null) {
  shownEntry = entry
}

/** Remember the scroll of the page on screen, before leaving it. */
export function saveShownEntryScroll() {
  const scroller = getAppScroller()
  if (!scroller || shownEntry === null) return
  savedTops.set(shownEntry, scroller.scrollTop)
}

export function savedTopFor(entry: number | null): number | undefined {
  return entry === null ? undefined : savedTops.get(entry)
}
