<template>
  <main class="page-content">

    <!-- Sticky header + tabs -->
    <div class="sticky-top">
      <header class="page-header">
        <div>
          <h1>Explore</h1>
        </div>
        <NuxtLink to="/branches" class="search-btn" aria-label="Browse all branches">
          <IconSearch />
        </NuxtLink>
      </header>

      <!-- Tab pills -->
      <nav class="tab-bar" role="tablist">
      <button class="tab-pill" :class="{ active: activeTab === 'near-me' }" role="tab"
        :aria-selected="activeTab === 'near-me'" @click="activeTab = 'near-me'">Near Me</button>
      <button class="tab-pill" :class="{ active: activeTab === 'routes' }" role="tab"
        :aria-selected="activeTab === 'routes'" @click="activeTab = 'routes'">Day Trips</button>
      <button class="tab-pill" :class="{ active: activeTab === 'working-toward' }" role="tab"
        :aria-selected="activeTab === 'working-toward'" @click="activeTab = 'working-toward'">Extra Credit</button>
      </nav>
    </div>

    <!-- Near Me -->
    <section v-show="activeTab === 'near-me'" class="explore-section">
      <div v-if="geoStatus === 'loading'" class="geo-state">
        <span class="geo-spinner" />
        <span>Finding branches near you…</span>
      </div>

      <p v-else-if="geoStatus === 'denied'" class="geo-denied">{{ geoDeniedMessage }}</p>

      <div v-else-if="geoStatus === 'ready'" class="near-me-list">
        <BranchCard v-for="item in nearMeBranches" :key="item.branch.BranchCode" :branch="item.branch"
          :distance="item.distanceLabel" as-button @select="openBranchSheet" />
      </div>
    </section>

    <!-- Working Toward -->
    <section v-show="activeTab === 'working-toward'" class="explore-section">
      <div v-if="badgeSuggestions.length === 0" class="extra-credit-empty">
        <p>You've earned every badge. Well done!</p>
      </div>
      <div v-else class="badge-suggestions">
        <div v-for="s in badgeSuggestions" :key="s.id" class="suggestion-card">
          <div class="suggestion-badge" :class="s.shape" :style="{ background: badgeBg(s.id) }">
            <span v-if="s.label" class="suggestion-badge-label">{{ s.label }}</span>
          </div>
          <div class="suggestion-body">
            <div class="suggestion-header">
              <span class="suggestion-title">{{ s.title }}</span>
              <div class="suggestion-bar">
                <div class="suggestion-fill" :style="{ width: (s.pct * 100) + '%' }" />
              </div>
            </div>
            <p class="suggestion-message">{{ s.message }}</p>
            <div v-if="s.branches.length" class="suggestion-branches">
              <p class="suggestion-subhead">Suggested:</p>
              <BranchCard v-for="b in s.branches" :key="b.BranchCode" :branch="b" compact as-button
                @select="openBranchSheet" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Day Trips -->
    <section v-show="activeTab === 'routes'" class="explore-section">

      <!-- Mode sub-tabs -->
      <nav class="mode-bar" role="tablist">
        <button v-for="mode in MODES" :key="mode.id" class="mode-tab" :class="{ active: activeMode === mode.id }"
          role="tab" :aria-selected="activeMode === mode.id" @click="activeMode = mode.id">
          <IconMode class="mode-icon" v-html="mode.icon" />
          {{ mode.label }}
        </button>
      </nav>

      <!-- Walking routes -->
      <div v-if="activeMode === 'walk'" class="routes-list">
        <NuxtLink v-for="route in routesWithProgress" :key="route.id" :to="'/day-trips/' + route.id" class="route-card" @click="$posthog?.capture('day_trip_tapped', { route_id: route.id, route_name: route.name, visited: route.visited, total: route.total })">
          <div class="route-meta-row">
            <span class="area-chip">{{ route.area }}</span>
            <span class="route-info">🚶 {{ route.duration }} · {{ route.total }} stops</span>
            <IconChevron class="route-chevron" />
          </div>
          <p class="route-name">{{ route.name }}</p>
          <p class="route-desc">{{ route.description }}</p>
          <div class="route-stamps">
            <div v-for="b in route.branchObjects.slice(0, 4)" :key="b.BranchCode" class="route-stamp-item">
              <div :class="{ 'route-stamp-ghost': !passport.hasVisited(b.BranchCode) }">
                <StampShape :branchCode="b.BranchCode" :wardNo="b.WardNo" :size="40" />
              </div>
              <span class="route-stamp-label">{{ b.BranchName.replace(/ Branch$/, '') }}</span>
            </div>
            <div v-if="route.branchObjects.length > 4" class="route-overflow">
              +{{ route.branchObjects.length - 4 }}<br>More
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Stubbed modes -->
      <p v-else class="coming-soon">
        {{MODES.find(m => m.id === activeMode)?.label}} routes coming soon.
      </p>

    </section>

    <!-- Browse All CTA -->
    <div class="browse-cta">
      <NuxtLink to="/branches" class="browse-btn">Browse all Branches</NuxtLink>
    </div>

  </main>

  <!-- Branch detail sheet -->
  <BaseSheet v-model:open="branchSheetOpen" :height="branchSheetHeight">
    <BranchDetail v-if="activeBranch" :branch="activeBranch" source="explore" />
  </BaseSheet>

</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, haversineKm, formatDist, buildMapsUrl } from '~/composables/useRegion'
import routesData from '#data/routes.json'
import { BADGES, useBadgeCtx, badgeBg } from '~/composables/useBadges'
import IconSearch from '~/components/icons/IconSearch.vue'
import IconMode from '~/components/icons/IconMode.vue'
import IconChevron from '~/components/icons/IconChevron.vue'

const { $posthog } = useNuxtApp()
const passport = usePassportStore()

// ── Tab state ────────────────────────────────────────────────────────
const route = useRoute()
const activeTab = ref(route.query.tab === 'routes' ? 'routes' : 'near-me')
const activeMode = ref('walk')    // 'walk' | 'bike' | 'transit' | 'drive'

watch(activeMode, (mode) => {
  $posthog?.capture('transport_mode_changed', { mode })
})

const MODES = [
  {
    id: 'walk', label: 'Walk',
    icon: '<circle cx="12" cy="4.5" r="1.5"/><path d="M10 8.5l-2 7h2.5l.5 4h2l.5-4H16l-2-7"/><path d="M10 8.5l2-1.5 2 1.5"/>',
  },
  {
    id: 'bike', label: 'Bike',
    icon: '<circle cx="6" cy="15" r="3"/><circle cx="18" cy="15" r="3"/><path d="M6 15l4-6h4l2 6"/><path d="M10 9l2 6"/><path d="M15 9h3"/>',
  },
  {
    id: 'transit', label: 'Transit',
    icon: '<rect x="6" y="3" width="12" height="15" rx="2"/><path d="M6 11h12"/><path d="M9 7h2M13 7h2"/><path d="M8 18l-1 3M16 18l1 3"/>',
  },
  {
    id: 'drive', label: 'Drive',
    icon: '<path d="M5 11l2-5h10l2 5v5H5z"/><circle cx="8.5" cy="16" r="1.5"/><circle cx="15.5" cy="16" r="1.5"/><path d="M5 13h14"/>',
  },
]

// ── Near Me ──────────────────────────────────────────────────────────
const userLat = ref(null)
const userLng = ref(null)
const geoStatus = ref('loading') // 'loading' | 'ready' | 'denied'
const geoDeniedMessage = computed(() =>
  navigator?.geolocation
    ? 'Allow location access to see branches near you.'
    : 'Geolocation not available on this device.'
)

onMounted(() => {
  if (!navigator?.geolocation) {
    geoStatus.value = 'denied'
    return
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat.value = pos.coords.latitude
      userLng.value = pos.coords.longitude
      geoStatus.value = 'ready'
    },
    () => { geoStatus.value = 'denied' }
  )
})

const nearMeBranches = computed(() => {
  if (geoStatus.value !== 'ready') return []
  const withDistance = physicalBranches
    .map(b => ({
      branch: b,
      km: haversineKm(userLat.value, userLng.value, b.Lat, b.Long),
      visited: passport.hasVisited(b.BranchCode),
    }))
    .sort((a, b) => a.km - b.km)

  const nearest = withDistance[0]
  const unvisited = withDistance
    .filter(item => !item.visited && item.branch.BranchCode !== nearest.branch.BranchCode)
    .slice(0, 4)

  return [nearest, ...unvisited].map(item => ({ ...item, distanceLabel: formatDist(item.km) }))
})

// ── Badge Suggestions ─────────────────────────────────────────────────
const badgeCtx = useBadgeCtx()

const badgeSuggestions = computed(() => {
  const ctx = badgeCtx.value
  return BADGES
    .filter(a => !a.earned(ctx))
    .map(a => ({ id: a.id, title: a.title, shape: a.shape, label: a.label ?? null, ...a.suggest(ctx) }))
    .filter(s => s.message)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
})

// ── Suggested Routes ─────────────────────────────────────────────────
const branchesByCode = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b]))

const routesWithProgress = computed(() =>
  routesData
    .filter(r => r.mode === activeMode.value)
    .map(r => {
      const branchObjects = r.branches.map(code => branchesByCode[code]).filter(Boolean)
      const visited = branchObjects.filter(b => passport.hasVisited(b.BranchCode)).length
      return { ...r, branchObjects, visited, total: branchObjects.length, mapsUrl: buildMapsUrl(branchObjects) }
    })
)

// ── Sheets ────────────────────────────────────────────────────────────
const branchSheetOpen = ref(false)
const activeBranch = ref(null)
const branchSheetHeight = 'calc(100dvh - var(--nav-height) - 60px)'

function openBranchSheet(branch) {
  activeBranch.value = branch
  branchSheetOpen.value = true
}
</script>

<style scoped>
/* Extra bottom padding so fixed browse button doesn't overlap content */
.page-content {
  padding-bottom: calc(var(--nav-height) + 72px);
}

/* ── Sticky header block ─────────────────────────────────────────── */
.sticky-top {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 10;
  margin: 0 -18px;
  background: var(--tpl-navy);
}

/* ── Page header ─────────────────────────────────────────────────── */
.page-header {
  padding: 14px 18px 14px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.page-header h1 {
  margin-bottom: 3px;
  color: rgba(255, 255, 255, 0.92);
}

.sub {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.55);
}

.search-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s, background 0.15s;
}

.search-btn svg {
  width: 18px;
  height: 18px;
}

.search-btn:active {
  background: var(--color-paper);
  border-color: var(--tpl-blue);
}

/* ── Sections ────────────────────────────────────────────────────── */
.explore-section {
  margin-top: 20px;
  margin-bottom: 28px;
}


/* ── Tab bar ─────────────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  margin: 0;
  padding: 0 18px;
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  border-bottom: 1.5px solid var(--color-border-soft);
}

.tab-bar::-webkit-scrollbar {
  display: none;
}

.tab-pill {
  flex: 1;
  text-align: center;
  padding: 10px 8px;
  border: none;
  border-bottom: 2.5px solid transparent;
  margin-bottom: -1.5px;
  background: none;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.tab-pill {
  &.active {
    color: var(--tpl-navy);
    border-bottom-color: var(--tpl-navy);
  }
}

:global([data-theme="dark"]) .tab-pill.active {
  color: var(--color-brand-text);
  border-bottom-color: var(--color-brand-text);
}

/* ── Near Me ─────────────────────────────────────────────────────── */
.geo-state {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 14px 0;
}

.geo-denied {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 8px 0;
}

.geo-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--tpl-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.near-me-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Badge Suggestions ───────────────────────────────────────────── */
.badge-suggestions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.suggestion-badge {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.suggestion-badge.octagon {
  clip-path: polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%);
}

.suggestion-badge.circle {
  border-radius: 50%;
}

.suggestion-badge.star {
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

.suggestion-badge-label {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.suggestion-body {
  flex: 1;
  min-width: 0;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.suggestion-title {
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  color: var(--color-text);
}

.suggestion-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.suggestion-fill {
  height: 100%;
  background: var(--tpl-blue);
  border-radius: 2px;
  transition: width 0.3s ease;
  min-width: 2px;
}

.suggestion-message {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  margin: 0 0 8px;
}

.suggestion-branches {
  margin-left: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.suggestion-subhead {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin-bottom: 2px;
}

/* ── Browse CTA — fixed above nav ───────────────────────────────── */
.browse-cta {
  position: fixed;
  bottom: var(--nav-height);
  left: 0;
  right: 0;
  margin: 0 auto;
  max-width: 480px;
  padding: 16px 18px 12px;
  background: linear-gradient(to bottom, transparent, var(--color-bg) 40%);
  z-index: 5;
  pointer-events: none;
}

.browse-btn {
  display: block;
  width: 100%;
  padding: 12px;
  border-radius: var(--radius);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  pointer-events: all;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s;
  box-shadow: var(--shadow-sm);
}

.browse-btn:active {
  border-color: var(--tpl-blue);
  color: var(--tpl-blue);
}

/* ── Day Trips ───────────────────────────────────────────────────── */
.mode-bar {
  display: flex;
  margin: 0 -18px 16px;
  padding: 0 18px;
  border-bottom: 1.5px solid var(--color-border-soft);
  overflow-x: auto;
  scrollbar-width: none;
}

.mode-bar::-webkit-scrollbar {
  display: none;
}

.mode-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 6px;
  border: none;
  border-bottom: 2.5px solid transparent;
  margin-bottom: -1.5px;
  background: none;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.mode-tab {
  &.active {
    color: var(--tpl-navy);
    border-bottom-color: var(--tpl-navy);

    @media (prefers-color-scheme: dark) {
      & {
        color: var(--color-brand-text);
        border-bottom-color: var(--color-brand-text);
      }
    }
  }
}

:global([data-theme="dark"]) .mode-tab.active {
  color: var(--color-brand-text);
  border-bottom-color: var(--color-brand-text);
}

.mode-icon {
  width: 20px;
  height: 20px;
}

.routes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.route-card {
  display: block;
  text-align: left;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route-card:active {
  background: var(--color-paper);
  border-color: var(--color-border);
}

.route-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.area-chip {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tpl-navy);
  background: color-mix(in srgb, var(--tpl-navy) 8%, transparent);
  border-radius: 999px;
  padding: 2px 8px;
  flex-shrink: 0;
}

.route-info {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.route-chevron {
  width: 14px;
  height: 14px;
  stroke: var(--color-text-muted);
  flex-shrink: 0;
  margin-left: auto;
}

.route-name {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.25;
  margin: 0;
}

.route-desc {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.route-stamps {
  display: flex;
  gap: 6px;
  padding-top: 4px;
}

.route-stamp-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.route-stamp-ghost {
  opacity: 0.18;
  filter: grayscale(1);
}

.route-stamp-label {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.3;
}

.route-overflow {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border-soft);
  border-radius: var(--radius-sm, 6px);
  min-height: 40px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.4;
}

.coming-soon {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 24px 0;
  text-align: center;
}
</style>
