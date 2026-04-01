<template>
  <main class="page-content">
    <div class="sticky-top" ref="stickyTopRef">
      <header class="page-header" ref="pageHeaderRef">
        <div>
          <h1>My Passport</h1>
          <p class="sub">{{ passport.visitCount }} of {{ physicalBranches.length }} stamps collected</p>
        </div>
        <NuxtLink to="/history" class="all-visits-link">All visits</NuxtLink>
      </header>

      <!-- Page navigation tabs: alpha ranges + Extra Credit -->
      <nav class="page-nav" aria-label="Passport pages" role="tablist">
        <button v-for="(page, i) in branchesByAlphaPage" :key="page.label" class="page-tab" :class="{
          active: activePage === i,
          complete: isPageComplete(page),
        }" role="tab" :aria-selected="activePage === i" @click="goToPage(i)">
          {{ page.label }}
        </button>
        <button class="page-tab" :class="{
          active: activePage === EXTRA_CREDIT_IDX,
          complete: extraCreditEarned === BADGES.length,
        }" role="tab" :aria-selected="activePage === EXTRA_CREDIT_IDX" @click="goToPage(EXTRA_CREDIT_IDX)">
          Extra Credit
        </button>
      </nav>
    </div>

    <div class="passport-book">
      <!-- Alpha pages -->
      <section v-for="(page, i) in branchesByAlphaPage" v-show="activePage === i" :key="page.label"
        class="passport-page" :class="{ complete: isPageComplete(page) }">
        <div class="page-header-row" :style="{ top: stickyHeight + 'px' }">
          <span class="page-range">{{ page.label }}</span>
          <div class="page-header-right">
            <svg v-if="isPageComplete(page)" class="page-seal" viewBox="0 0 20 20" fill="none" stroke="currentColor"
              aria-hidden="true">
              <circle cx="10" cy="10" r="8.5" stroke-width="1.5" />
              <circle cx="10" cy="10" r="5.5" stroke-width="1" opacity="0.35" />
              <polyline points="6.5 10 9 12.5 13.5 7.5" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
            <span class="page-count">{{ pageVisitCount(page) }}/{{ page.branches.length }}</span>
          </div>
        </div>

        <div class="stamp-grid">
          <template v-for="branch in page.branches" :key="branch.BranchCode">
            <button class="stamp-slot" @click="openSheet(branch)">
              <div v-if="!passport.hasVisited(branch.BranchCode)" class="stamp-ghost">
                <StampShape :branchCode="branch.BranchCode" :wardNo="branch.WardNo" />
              </div>
              <StampShape v-else :branchCode="branch.BranchCode" :wardNo="branch.WardNo" />
              <span class="stamp-name" :class="{ unseen: !passport.hasVisited(branch.BranchCode) }">{{ branch.BranchName
                }}</span>
              <span v-if="passport.hasVisited(branch.BranchCode)" class="stamp-date">{{ visitDate(branch.BranchCode)
                }}</span>
            </button>
          </template>
          <!-- phantom cell keeps the grid even when a page has an odd branch count -->
          <div v-if="page.branches.length % 2 !== 0" class="stamp-slot phantom" aria-hidden="true" />
        </div>

        <nav class="page-turner" aria-label="Navigate pages">
          <button v-if="activePage > 0" class="turner-btn prev" @click="goToPage(activePage - 1)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true">
              <polyline points="10 3 5 8 10 13" />
            </svg>
            {{ ALL_PAGES[activePage - 1] }}
          </button>
          <span v-else />
          <button v-if="activePage < EXTRA_CREDIT_IDX" class="turner-btn next" @click="goToPage(activePage + 1)">
            {{ ALL_PAGES[activePage + 1] }}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 3 11 8 6 13" />
            </svg>
          </button>
          <span v-else />
        </nav>
      </section>

      <!-- Extra Credit page -->
      <div v-show="activePage === EXTRA_CREDIT_IDX" class="badges-section"
        :class="{ complete: extraCreditEarned === BADGES.length }">
        <div class="page-header-row" :style="{ top: stickyHeight + 'px' }">
          <span class="page-range">Extra Credit</span>
          <div class="page-header-right">
            <svg v-if="extraCreditEarned === BADGES.length" class="page-seal" viewBox="0 0 20 20" fill="none"
              stroke="currentColor" aria-hidden="true">
              <circle cx="10" cy="10" r="8.5" stroke-width="1.5" />
              <circle cx="10" cy="10" r="5.5" stroke-width="1" opacity="0.35" />
              <polyline points="6.5 10 9 12.5 13.5 7.5" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
            <span class="page-count">{{ extraCreditEarned }}/{{ BADGES.length }}</span>
          </div>
        </div>
        <BadgesSection :sheet-height="sheetHeight" />

        <nav class="page-turner" aria-label="Navigate pages">
          <button class="turner-btn prev" @click="goToPage(EXTRA_CREDIT_IDX - 1)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true">
              <polyline points="10 3 5 8 10 13" />
            </svg>
            {{ ALL_PAGES[EXTRA_CREDIT_IDX - 1] }}
          </button>
          <span />
        </nav>
      </div>
    </div>
  </main>

  <!-- Stamp detail sheet -->
  <BaseSheet v-model:open="sheetOpen" :height="sheetHeight" :aria-label="activeStamp?.BranchName + ' stamp detail'">
    <BranchDetail v-if="activeStamp" :branch="activeStamp" />
  </BaseSheet>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, branchesByAlphaPage } from '~/composables/useRegion'
import { BADGES, useBadgeCtx } from '~/composables/useBadges'

const passport = usePassportStore()
const route = useRoute()

const EXTRA_CREDIT_IDX = branchesByAlphaPage.length  // index of Extra Credit tab (= 5)
const ALL_PAGES = [...branchesByAlphaPage.map(p => p.label), 'Extra Credit']

const activeStamp = ref(null)
const sheetOpen = ref(false)
watch(sheetOpen, open => { if (!open) activeStamp.value = null })
const activePage = ref(route.query.page !== undefined ? Number(route.query.page) : 0)
const stickyTopRef = ref(null)
const pageHeaderRef = ref(null)
const stickyHeight = ref(156)  // sticky block height — drives page-header-row top
const pageHeaderHeight = ref(68) // h1 row height — drives sheet top edge

const sheetHeight = computed(() =>
  `calc(100dvh - var(--nav-height) - ${pageHeaderHeight.value}px)`
)

function remeasure() {
  if (stickyTopRef.value) stickyHeight.value = stickyTopRef.value.offsetHeight
  if (pageHeaderRef.value) pageHeaderHeight.value = pageHeaderRef.value.offsetHeight
}

const badgeCtx = useBadgeCtx()
const extraCreditEarned = computed(() => BADGES.filter(a => a.earned(badgeCtx.value)).length)

function goToPage(i) {
  activePage.value = i
  window.scrollTo({ top: 0, behavior: 'instant' })
}

function openSheet(branch) {
  activeStamp.value = branch
  sheetOpen.value = true
}

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

onMounted(() => {
  if (!import.meta.client) return
  if (route.hash === '#extra-credit') {
    activePage.value = EXTRA_CREDIT_IDX
  }
  remeasure()
  window.addEventListener('resize', remeasure)
})

onUnmounted(() => {
  window.removeEventListener('resize', remeasure)
})
</script>

<style scoped>
/* ── Sticky header block (title + tabs) ── */
.sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-bg);
  /* Bleed to screen edges */
  margin: 0 -18px;
  padding: 0 18px;
}

.page-header {
  padding: 16px 0 6px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;

  & h1 {
    margin-bottom: 4px;
  }
}

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
  border-bottom: 2px solid var(--color-border-soft);
}

.page-tab {
  flex: 1;
  padding: 10px 6px;
  border: none;
  border-right: 1px solid var(--color-border-soft);
  border-bottom: 3px solid var(--color-bg);
  margin-bottom: -2px;
  background: none;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;

  &:last-child {
    border-right: none;
  }

  &.active {
    color: var(--tpl-navy);
    border-bottom-color: var(--tpl-navy);
  }

  /* Completed — light tint signals progress without conflicting with active underline */
  &.complete {
    background: color-mix(in srgb, var(--tpl-blue) 8%, transparent);
  }
}

/* Active tab uses --tpl-navy which is near-black in dark mode — swap to brand text */
@media (prefers-color-scheme: dark) {
  .page-tab.active {
    color: var(--color-brand-text);
    border-bottom-color: var(--color-brand-text);
  }
}

:global([data-theme="dark"]) .page-tab.active {
  color: var(--color-brand-text);
  border-bottom-color: var(--color-brand-text);
}

/* ── Book container — bleed to screen edges ── */
.passport-book {
  padding-bottom: 24px;
  margin: 0 -18px;
}

/* ── Each alpha "page" — full-bleed section ── */
.passport-page {
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06), 0 -1px 0 rgba(0, 0, 0, 0.04);

  @media (prefers-color-scheme: dark) {
    & {
      background: rgba(255, 255, 255, 0.04);
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06), 0 -1px 0 rgba(0, 0, 0, 0.2);
    }
  }
}

:global([data-theme="dark"]) .passport-page {
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06), 0 -1px 0 rgba(0, 0, 0, 0.2);
}

/* ── Page header row — sticky within its section ── */
.page-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: background 0.2s ease;
  position: sticky;
  z-index: 5;
  background: var(--color-bg);
}

.passport-page.complete .page-header-row,
.badges-section.complete .page-header-row {
  background: color-mix(in srgb, #c87820 10%, var(--color-bg));
}

.page-range {
  font-family: var(--font-display);
  font-size: 1rem;
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
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

/* ── Stamp grid ── */
.stamp-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);

  /* Center vertical dashed divider */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    background-image: var(--dashed-divider-v);
    background-size: 2px 8px;
    pointer-events: none;
  }
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
  border-bottom: 2px dashed var(--color-border);
  /* Reset <button> */
  color: var(--color-text);
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  font: inherit;
  width: 100%;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &.phantom {
    pointer-events: none;
  }
}

/* Ghosted unvisited stamp */
.stamp-ghost {
  opacity: 0.13;
  filter: grayscale(1);
}

.stamp-name {
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  color: var(--color-text-mid);
  line-height: 1.3;
  max-width: 160px;

  &.unseen {
    color: var(--color-text-muted);
    opacity: 0.65;
  }
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
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 8px 4px;
  letter-spacing: 0.02em;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;

  &:active {
    color: var(--tpl-navy);
  }

  & svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
}
</style>
