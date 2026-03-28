<template>
  <main class="page-content">

    <header class="route-header">
      <button class="back-btn" @click="navigateTo('/explore?tab=routes')" aria-label="Back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="header-text">
        <h1 class="route-title">{{ trip.name }}</h1>
        <p class="route-chips">{{ trip.area }} · {{ branchObjects.length }} stops · {{ trip.duration }}</p>
      </div>
    </header>

    <p class="route-description">{{ trip.description }}</p>

    <a :href="mapsUrl" target="_blank" rel="noopener" class="maps-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
      Open full route in Maps
    </a>

    <section class="stops-section">
      <h2 class="stops-title">Stops</h2>
      <div class="stops-list">
        <button
          v-for="(b, i) in branchObjects"
          :key="b.BranchCode"
          class="stop-card"
          @click="openSheet(b)"
        >
          <span class="stop-number">{{ i + 1 }}</span>
          <div class="stop-stamp" :class="{ 'stop-stamp--ghost': !passport.hasVisited(b.BranchCode) }">
            <StampShape :branchCode="b.BranchCode" :wardNo="b.WardNo" :size="44" />
          </div>
          <div class="stop-info">
            <span class="stop-name">{{ b.BranchName }}</span>
            <span class="stop-status">{{ passport.hasVisited(b.BranchCode) ? 'Visited' : 'Never been' }}</span>
          </div>
          <svg class="stop-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </section>

    <section class="suggestions-section">
      <h2 class="stops-title">Local Suggestions</h2>
      <p class="suggestions-empty">
        Curated tips from locals and librarians — coming soon.
      </p>
    </section>

  </main>

  <!-- Branch detail sheet -->
  <DrawerRoot v-model:open="sheetOpen" :noBodyStyles="true">
    <DrawerPortal>
      <DrawerOverlay class="sheet-overlay" />
      <DrawerContent class="route-branch-sheet" :style="{ height: sheetHeight }">
        <div class="sheet-handle-row"><div class="sheet-handle-bar" /></div>
        <button class="sheet-close" @click="sheetOpen = false" aria-label="Close">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="6" y1="6" x2="14" y2="14"/><line x1="14" y1="6" x2="6" y2="14"/>
          </svg>
        </button>
        <div v-if="activeBranch" class="sheet-scroll">
          <BranchDetail :branch="activeBranch" />
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<script setup>
import { DrawerRoot, DrawerPortal, DrawerOverlay, DrawerContent } from 'vaul-vue'
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'
import routesData from '#data/routes.json'

const nuxtRoute = useRoute()
const passport  = usePassportStore()

const trip = routesData.find(r => r.id === nuxtRoute.params.id)

if (!trip) {
  throw createError({ statusCode: 404, statusMessage: 'Route not found' })
}

const branchesByCode = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b]))
const branchObjects  = trip.branches.map(code => branchesByCode[code]).filter(Boolean)

const mapsUrl = 'https://www.google.com/maps/dir/' +
  branchObjects.map(b => `${b.Lat},${b.Long}`).join('/')

const sheetOpen    = ref(false)
const activeBranch = ref(null)
const sheetHeight  = 'calc(100dvh - var(--nav-height) - 60px)'

function openSheet(branch) {
  activeBranch.value = branch
  sheetOpen.value = true
}
</script>

<style scoped>
.page-content {
  padding-bottom: calc(var(--nav-height) + 24px);
}

.route-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 0 12px;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 2px;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s;
}

.back-btn svg { width: 18px; height: 18px; }
.back-btn:active { border-color: var(--tpl-blue); }

.header-text { flex: 1; min-width: 0; }

.route-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.route-chips {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.route-description {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 16px;
}

.maps-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  background: var(--tpl-blue);
  color: #fff;
  border-radius: var(--radius-pill);
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 28px;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s;
}

.maps-btn:active { opacity: 0.85; }
.maps-btn svg { width: 16px; height: 16px; stroke: #fff; }

.stops-section { margin-bottom: 28px; }
.suggestions-section { margin-bottom: 16px; }

.stops-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--color-text);
}

.stops-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stop-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  text-align: left;
  width: 100%;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s;
}

.stop-card:active {
  background: var(--color-paper);
  border-color: var(--color-border);
}

.stop-number {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-muted);
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.stop-stamp { flex-shrink: 0; }

.stop-stamp--ghost {
  opacity: 0.35;
  filter: grayscale(1);
}

.stop-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stop-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stop-status {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stop-chevron {
  width: 16px;
  height: 16px;
  stroke: var(--color-border);
  flex-shrink: 0;
}

.suggestions-empty {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-style: italic;
}

/* ── Sheet ───────────────────────────────────────────────────────── */
:global(.sheet-overlay) {
  position: fixed;
  top: 0; left: 0; right: 0;
  bottom: var(--nav-height);
  background: rgba(0, 0, 0, 0.42);
  z-index: 90;
}

:global(.route-branch-sheet) {
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

.sheet-close {
  position: absolute;
  top: 10px; right: 14px;
  width: 36px; height: 36px;
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

.sheet-scroll {
  height: calc(100% - 48px);
  overflow-y: auto;
  padding: 0 20px 32px;
}
</style>
