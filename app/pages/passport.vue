<template>
  <main class="page-content">
    <div class="sticky-top">
      <header class="page-header">
        <div>
          <h1>Your Passport</h1>
          <p class="sub">{{ passport.visitCount }} of {{ physicalBranches.length }} stamps collected</p>
        </div>
        <NuxtLink to="/history" class="all-visits-link">All visits</NuxtLink>
      </header>

      <!-- Page navigation pills -->
      <nav class="page-nav" aria-label="Passport pages">
      <button
        v-for="(page, i) in branchesByAlphaPage"
        :key="page.label"
        class="page-pill"
        :class="{
          'page-pill--active':    activePage === i,
          'page-pill--complete':  isPageComplete(page),
        }"
        @click="scrollToPage(i)"
        :aria-current="activePage === i ? 'true' : undefined"
      >
        {{ page.label }}
      </button>
      </nav>
    </div>

    <div class="passport-book">
      <section
        v-for="(page, i) in branchesByAlphaPage"
        :key="page.label"
        :ref="el => { if (el) sectionEls[i] = el }"
        class="passport-page"
        :class="{ 'passport-page--complete': isPageComplete(page) }"
      >
        <div class="page-header-row">
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
            <!-- Visited: button opens detail sheet -->
            <button
              v-if="passport.hasVisited(branch.BranchCode)"
              class="stamp-slot stamp-slot--collected"
              @click="openSheet(branch)"
            >
              <StampShape :branchCode="branch.BranchCode" :wardNo="branch.WardNo" />
              <span class="stamp-name">{{ branch.BranchName }}</span>
              <span class="stamp-date">{{ visitDate(branch.BranchCode) }}</span>
            </button>
            <!-- Unvisited: ghosted stamp links to branch page -->
            <NuxtLink
              v-else
              :to="`/branch/${branch.BranchCode}`"
              class="stamp-slot"
            >
              <div class="stamp-ghost">
                <StampShape :branchCode="branch.BranchCode" :wardNo="branch.WardNo" />
              </div>
              <span class="stamp-name stamp-name--unseen">{{ branch.BranchName }}</span>
            </NuxtLink>
          </template>
          <!-- phantom cell keeps the grid even when a page has an odd branch count -->
          <div v-if="page.branches.length % 2 !== 0" class="stamp-slot stamp-slot--phantom" aria-hidden="true" />
        </div>
      </section>
    </div>
  </main>

  <!-- Stamp detail bottom sheet -->
  <Teleport to="body">
    <div v-if="activeStamp" class="sheet-backdrop" @click="closeSheet">
      <div class="stamp-sheet" @click.stop role="dialog" :aria-label="`${activeStamp.BranchName} stamp detail`">
        <div class="sheet-top-row">
          <div class="sheet-handle" />
          <button class="sheet-close" @click="closeSheet" aria-label="Close">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
              <line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/>
            </svg>
          </button>
        </div>

        <div class="sheet-stamp">
          <StampShape :branchCode="activeStamp.BranchCode" :wardNo="activeStamp.WardNo" :size="72" />
        </div>

        <h2 class="sheet-name">{{ activeStamp.BranchName }}</h2>

        <div class="sheet-visits">
          <div v-for="ci in branchVisits" :key="ci.timestamp" class="visit-row">
            <span class="visit-date">{{ formatVisitDate(ci.timestamp) }}</span>
            <p v-if="ci.note" class="visit-note">{{ ci.note }}</p>
            <span v-if="ci.hasPhoto" class="visit-photo">Photo saved</span>
          </div>
        </div>

        <NuxtLink
          :to="`/branch/${activeStamp.BranchCode}`"
          class="sheet-branch-link"
          @click="closeSheet"
        >
          Branch info
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="link-arrow" aria-hidden="true">
            <line x1="4" y1="10" x2="16" y2="10"/><polyline points="11 5 16 10 11 15"/>
          </svg>
        </NuxtLink>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, branchesByAlphaPage } from '~/composables/useRegion'

const passport = usePassportStore()
const activeStamp = ref(null)
const activePage  = ref(0)
const sectionEls  = []

// Scroll-spy: update active pill as sections cross the sticky header threshold
function onScroll() {
  let active = 0
  for (let i = 0; i < sectionEls.length; i++) {
    if (!sectionEls[i]) continue
    if (sectionEls[i].getBoundingClientRect().top <= 112) active = i
  }
  activePage.value = active
}

// Pill tap: smooth-scroll to that section (scroll-margin-top handles sticky offset)
function scrollToPage(i) {
  sectionEls[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let fadeObserver

const branchVisits = computed(() => {
  if (!activeStamp.value) return []
  return passport.checkIns
    .filter(c => c.branchCode === activeStamp.value.BranchCode)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
})

function openSheet(branch) {
  activeStamp.value = branch
}

function closeSheet() {
  activeStamp.value = null
}

// Lock body scroll while sheet is open
watch(activeStamp, (val) => {
  if (import.meta.client) {
    document.body.style.overflow = val ? 'hidden' : ''
  }
})

// Close sheet on Escape
function onKeydown(e) {
  if (e.key === 'Escape') closeSheet()
}

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('keydown', onKeydown)
  // Fade-in: sections become visible as they enter the viewport
  fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('section-visible')
    })
  }, { threshold: 0.05 })
  sectionEls.forEach(el => el && fadeObserver.observe(el))
})

onUnmounted(() => {
  if (!import.meta.client) return
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('keydown', onKeydown)
  fadeObserver?.disconnect()
  document.body.style.overflow = ''
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

function formatVisitDate(ts) {
  return new Date(ts).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
/* ── Sticky header block (title + pills) ── */
.sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-bg);
  padding-bottom: 2px;
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
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--tpl-blue);
  text-decoration: none;
  white-space: nowrap;
  padding-bottom: 2px;
}

/* ── Page navigation pills ── */
.page-nav {
  display: flex;
  gap: 6px;
  padding: 0 0 10px;
}

.page-pill {
  flex: 1;
  padding: 7px 0;
  border-radius: 20px;
  border: 1.5px solid var(--color-border);
  background: none;
  font: inherit;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.page-pill--active {
  background: var(--tpl-navy);
  border-color: var(--tpl-navy);
  color: #fff;
}

/* Completed but not active — signals progress at a glance */
.page-pill--complete:not(.page-pill--active) {
  border-color: var(--tpl-blue);
  color: var(--tpl-blue);
}

/* ── Book container ── */
.passport-book {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 24px;
}

/* ── Each alpha "page" is a card ── */
.passport-page {
  scroll-margin-top: 112px; /* clears sticky-top on pill tap */
  background: rgba(255, 255, 255, 0.72);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(0, 0, 0, 0.05);
  /* clip-path instead of overflow:hidden — clips corners without breaking sticky children */
  clip-path: inset(0 round 6px);
  /* Fade in as section enters viewport */
  opacity: 0;
  transition: opacity 0.4s ease;
}

/* Visible once intersected, or always for the first section */
.passport-page.section-visible,
.passport-page:first-child {
  opacity: 1;
}

@media (prefers-color-scheme: dark) {
  .passport-page { background: rgba(255, 255, 255, 0.05); box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.07); }
}
:global([data-theme="dark"]) .passport-page { background: rgba(255, 255, 255, 0.05); box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.07); }

/* ── Page header row — sticky within its card ── */
.page-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: background 0.2s ease;
  position: sticky;
  top: 108px; /* sits just below .sticky-top */
  z-index: 5;
  background: color-mix(in srgb, var(--color-bg) 28%, white);
}

.passport-page--complete .page-header-row {
  background: rgba(160, 100, 30, 0.07);
}

:global([data-theme="dark"]) .passport-page--complete .page-header-row { background: rgba(200, 150, 60, 0.1); }
@media (prefers-color-scheme: dark) {
  .passport-page--complete .page-header-row { background: rgba(200, 150, 60, 0.1); }
}

.page-range {
  font-family: var(--font-display);
  font-size: 0.95rem;
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
  font-size: 0.7rem;
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

/* center divider uses var(--color-border) via background-image gradient — adapts in dark mode */

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
  /* Reset for both <button> and <a> */
  text-decoration: none;
  color: var(--color-text);
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  font: inherit;
  width: 100%;
  box-sizing: border-box;
  cursor: default;
}

/* border-bottom uses var(--color-border) which already adapts in dark mode */

.stamp-slot--collected {
  cursor: pointer;
}
.stamp-slot--collected:hover {
  background: rgba(0, 0, 0, 0.02);
}
.stamp-slot--collected:active :deep(.stamp-shape) {
  transform: scale(0.94) rotate(calc(var(--stamp-rotate, 0deg) - 2deg));
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
  font-size: 0.7rem;
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
  font-size: 0.62rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

/* ── Bottom sheet backdrop ── */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.42);
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

/* ── Bottom sheet ── */
.stamp-sheet {
  width: 100%;
  max-width: 480px;
  background: var(--color-bg);
  border-radius: 20px 20px 0 0;
  padding: 0 20px 40px;
  max-height: 78vh;
  overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.sheet-top-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0 8px;
  position: relative;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 2px;
}

:global([data-theme="dark"]) .sheet-handle { background: rgba(255, 255, 255, 0.2); }
@media (prefers-color-scheme: dark) {
  .sheet-handle { background: rgba(255, 255, 255, 0.2); }
}

.sheet-close {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-close svg {
  width: 18px;
  height: 18px;
}

.sheet-stamp {
  display: flex;
  justify-content: center;
  padding: 16px 0 12px;
}

.sheet-name {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  text-align: center;
  color: var(--color-brand-text);
  margin-bottom: 20px;
  line-height: 1.25;
}

/* ── Visit list ── */
.sheet-visits {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.visit-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
}

:global([data-theme="dark"]) .visit-row { background: rgba(255, 255, 255, 0.05); }
@media (prefers-color-scheme: dark) {
  .visit-row { background: rgba(255, 255, 255, 0.05); }
}

.visit-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-mid);
}

.visit-note {
  font-size: 0.82rem;
  color: var(--color-text);
  line-height: 1.45;
  margin: 2px 0 0;
}

.visit-photo {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

/* ── Branch info link ── */
.sheet-branch-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 13px;
  border-radius: 10px;
  background: var(--tpl-blue);
  color: #fff;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.link-arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>
