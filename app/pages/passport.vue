<template>
  <main class="page-content">
    <div class="sticky-top" ref="stickyTopRef">
      <header class="page-header" ref="pageHeaderRef">
        <div>
          <h1>Your Passport</h1>
          <p class="sub">{{ passport.visitCount }} of {{ physicalBranches.length }} stamps collected</p>
        </div>
        <NuxtLink to="/history" class="all-visits-link">All visits</NuxtLink>
      </header>

      <!-- Page navigation tabs: alpha ranges + Extra Credit -->
      <nav class="page-nav" aria-label="Passport pages" role="tablist">
        <button
          v-for="(page, i) in branchesByAlphaPage"
          :key="page.label"
          class="page-tab"
          :class="{
            'page-tab--active':   activePage === i,
            'page-tab--complete': isPageComplete(page),
          }"
          role="tab"
          :aria-selected="activePage === i"
          @click="goToPage(i)"
        >
          {{ page.label }}
        </button>
        <button
          class="page-tab"
          :class="{
            'page-tab--active':   activePage === EXTRA_CREDIT_IDX,
            'page-tab--complete': extraCreditEarned === ACHIEVEMENTS.length,
          }"
          role="tab"
          :aria-selected="activePage === EXTRA_CREDIT_IDX"
          @click="goToPage(EXTRA_CREDIT_IDX)"
        >
          Extra Credit
        </button>
      </nav>
    </div>

    <div class="passport-book">
      <!-- Alpha pages -->
      <section
        v-for="(page, i) in branchesByAlphaPage"
        v-show="activePage === i"
        :key="page.label"
        class="passport-page"
        :class="{ 'passport-page--complete': isPageComplete(page) }"
      >
        <div class="page-header-row" :style="{ top: stickyHeight + 'px' }">
          <span class="page-range">{{ page.label }}</span>
          <div class="page-header-right">
            <svg v-if="isPageComplete(page)" class="page-seal" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
              <circle cx="10" cy="10" r="8.5" stroke-width="1.5"/>
              <circle cx="10" cy="10" r="5.5" stroke-width="1" opacity="0.35"/>
              <polyline points="6.5 10 9 12.5 13.5 7.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="page-count">{{ pageVisitCount(page) }}/{{ page.branches.length }}</span>
          </div>
        </div>

        <div class="stamp-grid">
          <template v-for="branch in page.branches" :key="branch.BranchCode">
            <button
              class="stamp-slot"
              :class="{ 'stamp-slot--collected': passport.hasVisited(branch.BranchCode) }"
              @click="openSheet(branch)"
            >
              <div v-if="!passport.hasVisited(branch.BranchCode)" class="stamp-ghost">
                <StampShape :branchCode="branch.BranchCode" :wardNo="branch.WardNo" />
              </div>
              <StampShape v-else :branchCode="branch.BranchCode" :wardNo="branch.WardNo" />
              <span class="stamp-name" :class="{ 'stamp-name--unseen': !passport.hasVisited(branch.BranchCode) }">{{ branch.BranchName }}</span>
              <span v-if="passport.hasVisited(branch.BranchCode)" class="stamp-date">{{ visitDate(branch.BranchCode) }}</span>
            </button>
          </template>
          <!-- phantom cell keeps the grid even when a page has an odd branch count -->
          <div v-if="page.branches.length % 2 !== 0" class="stamp-slot stamp-slot--phantom" aria-hidden="true" />
        </div>

        <nav class="page-turner" aria-label="Navigate pages">
          <button v-if="activePage > 0" class="turner-btn turner-btn--prev" @click="goToPage(activePage - 1)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="10 3 5 8 10 13"/></svg>
            {{ ALL_PAGES[activePage - 1] }}
          </button>
          <span v-else />
          <button v-if="activePage < EXTRA_CREDIT_IDX" class="turner-btn turner-btn--next" @click="goToPage(activePage + 1)">
            {{ ALL_PAGES[activePage + 1] }}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 3 11 8 6 13"/></svg>
          </button>
          <span v-else />
        </nav>
      </section>

      <!-- Extra Credit page -->
      <div
        v-show="activePage === EXTRA_CREDIT_IDX"
        class="badges-section"
        :class="{ 'badges-section--complete': extraCreditEarned === ACHIEVEMENTS.length }"
      >
        <div class="page-header-row" :style="{ top: stickyHeight + 'px' }">
          <span class="page-range">Extra Credit</span>
          <div class="page-header-right">
            <svg v-if="extraCreditEarned === ACHIEVEMENTS.length" class="page-seal" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
              <circle cx="10" cy="10" r="8.5" stroke-width="1.5"/>
              <circle cx="10" cy="10" r="5.5" stroke-width="1" opacity="0.35"/>
              <polyline points="6.5 10 9 12.5 13.5 7.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="page-count">{{ extraCreditEarned }}/{{ ACHIEVEMENTS.length }}</span>
          </div>
        </div>
        <AchievementsSection :sheet-height="sheetHeight" />

        <nav class="page-turner" aria-label="Navigate pages">
          <button class="turner-btn turner-btn--prev" @click="goToPage(EXTRA_CREDIT_IDX - 1)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="10 3 5 8 10 13"/></svg>
            {{ ALL_PAGES[EXTRA_CREDIT_IDX - 1] }}
          </button>
          <span />
        </nav>
      </div>
    </div>
  </main>

  <!-- Stamp detail sheet (vaul-vue) -->
  <DrawerRoot v-model:open="sheetOpen" :noBodyStyles="true">
    <DrawerPortal>
      <DrawerOverlay class="sheet-overlay" />
      <DrawerContent
        class="stamp-sheet"
        :style="{ height: sheetHeight }"
        :aria-label="activeStamp?.BranchName + ' stamp detail'"
      >
        <div class="sheet-handle-row"><div class="sheet-handle-bar" /></div>
        <button class="sheet-close" @click="sheetOpen = false" aria-label="Close">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="6" y1="6" x2="14" y2="14"/><line x1="14" y1="6" x2="6" y2="14"/>
          </svg>
        </button>

        <div v-if="activeStamp" class="sheet-scroll">
          <BranchDetail :branch="activeStamp" />
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<script setup>
import { DrawerRoot, DrawerPortal, DrawerOverlay, DrawerContent } from 'vaul-vue'
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, branchesByAlphaPage } from '~/composables/useRegion'
import { ACHIEVEMENTS, buildAchievementCtx } from '~/composables/useAchievements'

const passport = usePassportStore()
const route = useRoute()

const EXTRA_CREDIT_IDX = branchesByAlphaPage.length  // index of Extra Credit tab (= 5)
const ALL_PAGES = [...branchesByAlphaPage.map(p => p.label), 'Extra Credit']

const activeStamp    = ref(null)
const sheetOpen      = ref(false)
watch(sheetOpen, open => { if (!open) activeStamp.value = null })
const activePage     = ref(0)
const stickyTopRef   = ref(null)
const pageHeaderRef  = ref(null)
const stickyHeight   = ref(156)  // sticky block height — drives page-header-row top
const pageHeaderHeight = ref(68) // h1 row height — drives sheet top edge

const sheetHeight = computed(() =>
  `calc(100dvh - var(--nav-height) - ${pageHeaderHeight.value}px)`
)

function remeasure() {
  if (stickyTopRef.value)  stickyHeight.value    = stickyTopRef.value.offsetHeight
  if (pageHeaderRef.value) pageHeaderHeight.value = pageHeaderRef.value.offsetHeight
}

const extraCreditEarned = computed(() => {
  const ctx = buildAchievementCtx({
    checkIns:            passport.checkIns,
    visitedBranchCodes:  passport.visitedBranchCodes,
    completedChallenges: passport.completedChallenges,
    homeBranch:          passport.profile.homeBranch,
  })
  return ACHIEVEMENTS.filter(a => a.earned(ctx)).length
})

function goToPage(i) {
  activePage.value = i
  window.scrollTo({ top: 0, behavior: 'instant' })
}

function openSheet(branch) {
  activeStamp.value = branch
  sheetOpen.value = true
}

onMounted(() => {
  if (!import.meta.client) return
  if (route.hash === '#extra-credit' || route.hash === '#endorsements') {
    activePage.value = EXTRA_CREDIT_IDX
  }
  remeasure()
})

function isPageComplete(page) {
  return page.branches.every(b => passport.hasVisited(b.BranchCode))
}

function pageVisitCount(page) {
  return page.branches.filter(b => passport.hasVisited(b.BranchCode)).length
}

function visitDate(branchCode) {
  const c = passport.checkIns.find(x => x.branchCode === branchCode)
  if (!c) return ''
  return new Date(c.timestamp).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
/* ── Sticky header block (title + tabs) ── */
.sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-bg);
  padding-bottom: 0;
  /* Bleed to screen edges */
  margin-left: -18px;
  margin-right: -18px;
  padding-left: 18px;
  padding-right: 18px;
}

.page-header {
  padding: 16px 0 6px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.page-header h1 { margin-bottom: 4px; }
.sub {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
.all-visits-link {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--tpl-blue);
  text-decoration: none;
  white-space: nowrap;
  padding-bottom: 2px;
}

/* ── Page navigation tabs ── */
.page-nav {
  display: flex;
  margin: 0 -18px;
  padding: 0 18px;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1.5px solid var(--color-border-soft);
}

.page-nav::-webkit-scrollbar { display: none; }

.page-tab {
  flex-shrink: 0;
  padding: 10px 10px;
  border: none;
  border-bottom: 2.5px solid transparent;
  margin-bottom: -1.5px;
  background: none;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.page-tab--active {
  color: var(--tpl-navy);
  border-bottom-color: var(--tpl-navy);
}

/* Completed — light blue background signals progress without conflicting with active underline */
.page-tab--complete {
  background: rgba(0, 95, 192, 0.08);
}

/* ── Book container — bleed to screen edges ── */
.passport-book {
  padding-bottom: 24px;
  margin-left: -18px;
  margin-right: -18px;
}

/* ── Each alpha "page" — full-bleed section ── */
.passport-page {
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06), 0 -1px 0 rgba(0, 0, 0, 0.04);
}

@media (prefers-color-scheme: dark) {
  .passport-page { background: rgba(255, 255, 255, 0.04); box-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 -1px 0 rgba(0,0,0,0.2); }
}
:global([data-theme="dark"]) .passport-page { background: rgba(255, 255, 255, 0.04); box-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 -1px 0 rgba(0,0,0,0.2); }

/* ── Page header row — sticky within its section ── */
.page-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: background 0.2s ease;
  position: sticky;
  z-index: 5;
  background: var(--color-bg);
}

.passport-page--complete .page-header-row,
.badges-section--complete .page-header-row {
  background: color-mix(in srgb, #c87820 10%, var(--color-bg));
}

.page-range {
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-brand-text);
  letter-spacing: 0.04em;
}

.page-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-seal {
  width: 18px;
  height: 18px;
  color: var(--tpl-blue);
  flex-shrink: 0;
}

.page-count {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

/* ── Stamp grid ── */
.stamp-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}

/* Center vertical divider — dashed to match stamp slot borders */
.stamp-grid::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1.5px;
  background-image: repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 4px, transparent 4px, transparent 8px);
  background-size: 1.5px 8px;
  pointer-events: none;
}

/* ── Stamp slots ── */
.stamp-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 12px;
  min-height: 140px;
  border-bottom: 1.5px dashed var(--color-border);
  /* Reset <button> */
  color: var(--color-text);
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  font: inherit;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.stamp-slot--phantom {
  pointer-events: none;
}

/* Ghosted unvisited stamp */
.stamp-ghost {
  opacity: 0.13;
  filter: grayscale(1);
}

.stamp-name {
  font-size: 0.6875rem;
  font-weight: 500;
  text-align: center;
  color: var(--color-text-mid);
  line-height: 1.3;
  max-width: 160px;
}

.stamp-name--unseen {
  color: var(--color-text-muted);
  opacity: 0.65;
}

.stamp-date {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

/* ── Page turner navigation ── */
.page-turner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 18px 28px;
  border-top: 1px solid var(--color-border-soft);
  margin-top: 4px;
}

.turner-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 8px 4px;
  letter-spacing: 0.02em;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.turner-btn:active { color: var(--tpl-navy); }

.turner-btn svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--color-text-muted);
  transition: color 0.15s;
}

.turner-btn:active svg { color: var(--tpl-navy); }

/* ── Extra Credit section ── */
.badges-section {
  /* no special layout needed beyond the shared styles */
}

/* ── vaul-vue sheet overlay — stops at nav top, sits behind nav ── */
:global(.sheet-overlay) {
  position: fixed;
  top: 0; left: 0; right: 0;
  bottom: var(--nav-height);
  background: rgba(0, 0, 0, 0.42);
  z-index: 90;
}

/* ── vaul-vue sheet content ── */
:global(.stamp-sheet) {
  position: fixed;
  bottom: var(--nav-height) !important;
  left: 0; right: 0;
  margin: 0 auto;
  max-width: 480px;
  background: var(--color-bg) !important;
  border-radius: 20px 20px 0 0;
  z-index: 90;
  overflow: hidden;
  outline: none;
}

/* Handle row */
.sheet-handle-row {
  display: flex;
  justify-content: center;
  padding: 14px 0 8px;
}

.sheet-handle-bar {
  width: 36px;
  height: 4px;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 2px;
}

@media (prefers-color-scheme: dark) {
  .sheet-handle-bar { background: rgba(255, 255, 255, 0.2); }
}
:global([data-theme="dark"]) .sheet-handle-bar { background: rgba(255, 255, 255, 0.2); }

/* Close button */
.sheet-close {
  position: absolute;
  top: 10px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  cursor: pointer;
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
  z-index: 1;
}
.sheet-close:active { background: rgba(0, 0, 0, 0.2); }
.sheet-close svg { width: 16px; height: 16px; }

@media (prefers-color-scheme: dark) {
  .sheet-close { background: rgba(255, 255, 255, 0.14); }
  .sheet-close:active { background: rgba(255, 255, 255, 0.24); }
}
:global([data-theme="dark"]) .sheet-close { background: rgba(255, 255, 255, 0.14); }
:global([data-theme="dark"]) .sheet-close:active { background: rgba(255, 255, 255, 0.24); }

/* Scrollable content */
.sheet-scroll {
  height: calc(100% - 48px);
  overflow-y: auto;
  padding: 0 20px 32px;
}
</style>
