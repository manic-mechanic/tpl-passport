<template>
  <main class="page-content">

    <!-- Header -->
    <header class="page-header">
      <div>
        <h1>Explore</h1>
        <p class="sub">{{ passport.visitCount }} of {{ physicalBranches.length }} visited</p>
      </div>
      <button class="search-btn" @click="directoryOpen = true" aria-label="Browse all branches">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
    </header>

    <!-- Tab pills -->
    <nav class="tab-bar" role="tablist">
      <button
        class="tab-pill"
        :class="{ 'tab-pill--active': activeTab === 'near-me' }"
        role="tab"
        :aria-selected="activeTab === 'near-me'"
        @click="activeTab = 'near-me'"
      >Near Me</button>
      <button
        class="tab-pill"
        :class="{ 'tab-pill--active': activeTab === 'routes' }"
        role="tab"
        :aria-selected="activeTab === 'routes'"
        @click="activeTab = 'routes'"
      >Day Trips</button>
      <button
        class="tab-pill"
        :class="{ 'tab-pill--active': activeTab === 'working-toward' }"
        role="tab"
        :aria-selected="activeTab === 'working-toward'"
        @click="activeTab = 'working-toward'"
      >Extra Credit</button>
    </nav>

    <!-- Near Me -->
    <section v-show="activeTab === 'near-me'" class="explore-section">
      <div v-if="geoStatus === 'loading'" class="geo-state">
        <span class="geo-spinner" />
        <span>Finding branches near you…</span>
      </div>

      <p v-else-if="geoStatus === 'denied'" class="geo-denied">
        {{ navigator?.geolocation ? 'Allow location access to see branches near you.' : 'Geolocation not available on this device.' }}
      </p>

      <div v-else-if="geoStatus === 'ready'" class="near-me-list">
        <button
          v-for="item in nearMeBranches"
          :key="item.branch.BranchCode"
          class="branch-card"
          @click="openBranchSheet(item.branch)"
        >
          <div class="card-stamp" :class="{ 'card-stamp--ghost': !item.visited }">
            <StampShape :branchCode="item.branch.BranchCode" :wardNo="item.branch.WardNo" :size="40" />
          </div>
          <div class="card-info">
            <span class="card-name">{{ item.branch.BranchName }}</span>
            <span class="card-meta">{{ item.distanceLabel }} away · {{ item.visited ? 'visited' : 'never been' }}</span>
          </div>
          <svg class="card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </section>

    <!-- Working Toward -->
    <section v-show="activeTab === 'working-toward'" class="explore-section">
      <div class="badge-suggestions">
        <div v-for="s in badgeSuggestions" :key="s.id" class="suggestion-card">
          <div
            class="suggestion-badge"
            :class="`suggestion-badge--${s.shape}`"
            :style="{ background: badgeBg(s.id) }"
          >
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
            <div v-if="s.branches.length" class="suggestion-chips">
              <button
                v-for="b in s.branches"
                :key="b.BranchCode"
                class="branch-chip"
                @click.stop="openBranchSheet(b)"
              >
                {{ b.BranchName }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Day Trips -->
    <section v-show="activeTab === 'routes'" class="explore-section">

      <!-- Mode sub-tabs -->
      <nav class="mode-bar" role="tablist">
        <button
          v-for="mode in MODES"
          :key="mode.id"
          class="mode-tab"
          :class="{ 'mode-tab--active': activeMode === mode.id }"
          role="tab"
          :aria-selected="activeMode === mode.id"
          @click="activeMode = mode.id"
        >
          <svg class="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="mode.icon" />
          {{ mode.label }}
        </button>
      </nav>

      <!-- Walking routes -->
      <div v-if="activeMode === 'walk'" class="routes-list">
        <button
          v-for="route in routesWithProgress"
          :key="route.id"
          class="route-card"
          @click="navigateTo('/day-trips/' + route.id)"
        >
          <div class="route-top">
            <span class="route-name">{{ route.name }}</span>
            <svg class="route-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          <p class="route-meta">{{ route.area }} · {{ route.total }} stops · {{ route.duration }}</p>
          <div class="route-progress">
            <div class="route-bar">
              <div class="route-fill" :style="{ width: (route.visited / route.total * 100) + '%' }" />
            </div>
            <span class="route-count" :class="{ 'route-count--done': route.visited === route.total }">
              {{ route.visited }}/{{ route.total }}
            </span>
          </div>
        </button>
      </div>

      <!-- Stubbed modes -->
      <p v-else class="coming-soon">
        {{ MODES.find(m => m.id === activeMode)?.label }} routes coming soon.
      </p>

    </section>

    <!-- Browse All CTA -->
    <div class="browse-cta">
      <button class="browse-btn" @click="directoryOpen = true">
        Browse all {{ physicalBranches.length }} branches
      </button>
    </div>

  </main>

  <!-- Directory sheet -->
  <DrawerRoot v-model:open="directoryOpen" :noBodyStyles="true">
    <DrawerPortal>
      <DrawerOverlay class="sheet-overlay" />
      <DrawerContent class="directory-sheet">
        <div class="sheet-handle-row"><div class="sheet-handle-bar" /></div>
        <div class="directory-inner">
          <div class="directory-head">
            <p class="directory-title">All Branches</p>
            <p class="directory-count">{{ filteredBranches.length }} of {{ physicalBranches.length }}</p>
          </div>
          <div class="search-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              v-model="query"
              type="search"
              placeholder="Search by name or neighbourhood…"
              class="search-input"
            />
          </div>
          <div class="pill-bar">
            <button class="sort-tab" :class="{ 'sort-tab--active': visitFilter === 'unvisited' }" @click="visitFilter = visitFilter === 'unvisited' ? null : 'unvisited'">Unvisited</button>
            <button class="sort-tab" :class="{ 'sort-tab--active': visitFilter === 'visited' }" @click="visitFilter = visitFilter === 'visited' ? null : 'visited'">Visited</button>
            <span class="pill-divider" />
            <button class="sort-tab" :class="{ 'sort-tab--active': byDistrict }" @click="byDistrict = !byDistrict">District</button>
          </div>
          <div class="directory-scroll">
            <template v-if="byDistrict">
              <div v-for="district in visibleDistricts" :key="district" class="region-group">
                <p class="section-label">{{ district }}</p>
                <ul class="branch-list">
                  <li v-for="branch in byRegion[district]" :key="branch.BranchCode">
                    <BranchRow :branch="branch" as-button @select="openFromDirectory" />
                  </li>
                </ul>
              </div>
            </template>
            <ul v-else class="branch-list">
              <li v-for="branch in filteredBranches" :key="branch.BranchCode">
                <BranchRow :branch="branch" as-button @select="openFromDirectory" />
              </li>
            </ul>
          </div>
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>

  <!-- Branch detail sheet -->
  <DrawerRoot v-model:open="branchSheetOpen" :noBodyStyles="true">
    <DrawerPortal>
      <DrawerOverlay class="sheet-overlay" />
      <DrawerContent class="explore-branch-sheet" :style="{ height: branchSheetHeight }">
        <div class="sheet-handle-row"><div class="sheet-handle-bar" /></div>
        <button class="sheet-close" @click="branchSheetOpen = false" aria-label="Close">
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
import { physicalBranches, DISTRICT_ORDER, haversineKm, formatDist } from '~/composables/useRegion'
import { branchesByAlphaPage } from '~/composables/useRegion'
import routesData from '#data/routes.json'
import { ACHIEVEMENTS, buildAchievementCtx, compassPoints } from '~/composables/useAchievements'

const passport = usePassportStore()

// ── Tab state ────────────────────────────────────────────────────────
const _route    = useRoute()
const activeTab = ref(_route.query.tab === 'routes' ? 'routes' : 'near-me')
const activeMode = ref('walk')    // 'walk' | 'bike' | 'transit' | 'drive'

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
const userLat   = ref(null)
const userLng   = ref(null)
const geoStatus = ref('loading') // 'loading' | 'ready' | 'denied'

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
const badgeSuggestions = computed(() => {
  const ctx = buildAchievementCtx({
    checkIns: passport.checkIns,
    visitedBranchCodes: passport.visitedBranchCodes,
    completedChallenges: passport.completedChallenges,
    homeBranch: passport.profile.homeBranch,
  })

  const suggestions = []

  for (const a of ACHIEVEMENTS) {
    if (a.earned(ctx)) continue

    let pct = 0
    let message = ''
    let branches = []

    switch (a.id) {
      case 'first':
        message = 'Check in at your first branch'
        break

      case 'explorer':
        pct = ctx.visitCount / 10
        message = `${10 - ctx.visitCount} more branch${10 - ctx.visitCount === 1 ? '' : 'es'} to go`
        break

      case 'adventurer':
        pct = ctx.visitCount / 25
        message = `${25 - ctx.visitCount} more branches to go`
        break

      case 'globetrotter':
        pct = ctx.visitCount / 50
        message = `${50 - ctx.visitCount} more branches to go`
        break

      case 'complete':
        pct = ctx.visitCount / 100
        message = `${100 - ctx.visitCount} more branches to go`
        break

      case 'day_tripper':
        pct = ctx.maxBranchesInOneDay / 2
        message = 'Check in at 2 or more branches in one day'
        break

      case 'archivist':
        message = 'Add a note and photo to any check-in'
        break

      case 'familiar_face': {
        pct = ctx.homeVisitCount / 5
        const home = physicalBranches.find(b => b.BranchCode === passport.profile.homeBranch)
        if (home) {
          const rem = 5 - ctx.homeVisitCount
          message = `${rem} more visit${rem === 1 ? '' : 's'} to ${home.BranchName}`
          branches = [home]
        } else {
          message = 'Set a home branch in Settings to track this'
        }
        break
      }

      case 'return_visitor': {
        pct = ctx.maxNonHomeVisitCount / 3
        const best = Object.entries(ctx.branchVisitCounts)
          .filter(([code, count]) => count < 3 && code !== passport.profile.homeBranch)
          .sort((a, b) => b[1] - a[1])[0]
        if (best) {
          const [code, count] = best
          const branch = physicalBranches.find(b => b.BranchCode === code)
          if (branch) {
            const rem = 3 - count
            message = `${rem} more visit${rem === 1 ? '' : 's'} to ${branch.BranchName}`
            branches = [branch]
          }
        } else {
          message = 'Check in at any branch 3 times'
        }
        break
      }

      case 'navigator': {
        const remaining = Object.values(compassPoints)
          .filter(code => !ctx.visitedBranchCodes.has(code))
          .map(code => physicalBranches.find(b => b.BranchCode === code))
          .filter(Boolean)
        pct = (4 - remaining.length) / 4
        message = `Visit ${remaining.length} more compass branch${remaining.length === 1 ? '' : 'es'}`
        branches = remaining
        break
      }

      case 'page_filler': {
        const pages = branchesByAlphaPage
          .map(page => {
            const visitedCount = page.branches.filter(b => ctx.visitedBranchCodes.has(b.BranchCode)).length
            return { page, visitedCount, pct: visitedCount / page.branches.length }
          })
          .filter(p => p.pct < 1)
          .sort((a, b) => b.pct - a.pct)
        if (pages.length) {
          const best = pages[0]
          const unvisited = best.page.branches.filter(b => !ctx.visitedBranchCodes.has(b.BranchCode))
          pct = best.pct
          message = `Fill the ${best.page.label} page — ${best.visitedCount}/${best.page.branches.length} done`
          branches = unvisited.slice(0, 3)
        }
        break
      }

      case 'page_turner': {
        const emptyPages = branchesByAlphaPage.filter(page =>
          !page.branches.some(b => ctx.visitedBranchCodes.has(b.BranchCode))
        )
        const visitedPageCount = branchesByAlphaPage.length - emptyPages.length
        pct = visitedPageCount / branchesByAlphaPage.length
        message = `Visit a branch on ${emptyPages.length} more page${emptyPages.length === 1 ? '' : 's'}`
        branches = emptyPages.slice(0, 3).map(p => p.branches[0])
        break
      }
    }

    if (message) suggestions.push({ id: a.id, title: a.title, shape: a.shape, label: a.label ?? null, pct, message, branches })
  }

  return suggestions.sort((a, b) => b.pct - a.pct).slice(0, 3)
})

const BADGE_BG = {
  first:         'radial-gradient(circle, #7ab4ec 0%, #3878c4 100%)',
  explorer:      'radial-gradient(circle, #4a90d9 0%, #0048a8 100%)',
  adventurer:    'radial-gradient(circle, #2e74c8 0%, #0030a0 100%)',
  globetrotter:  'radial-gradient(circle, #1e60b4 0%, #001e78 100%)',
  complete:      'radial-gradient(circle, #001c70 0%, #000640 100%)',
  page_filler:   'radial-gradient(circle, #52cc84 0%, #1a6640 100%)',
  page_turner:   'radial-gradient(circle, #52cc84 0%, #1a6640 100%)',
  day_tripper:   'radial-gradient(circle, #eaa040 0%, #9e3c14 100%)',
  archivist:     'radial-gradient(circle, #eaa040 0%, #9e3c14 100%)',
  familiar_face: 'radial-gradient(circle, #eaa040 0%, #9e3c14 100%)',
  return_visitor:'radial-gradient(circle, #eaa040 0%, #9e3c14 100%)',
  navigator:     'radial-gradient(circle, #5a8fd8 0%, #1a4490 100%)',
}

function badgeBg(id) { return BADGE_BG[id] ?? 'var(--color-border)' }

// ── Suggested Routes ─────────────────────────────────────────────────
const branchesByCode = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b]))

function mapsUrl(branches) {
  const stops = branches.map(b => `${b.Lat},${b.Long}`)
  return 'https://www.google.com/maps/dir/' + stops.join('/')
}

const routesWithProgress = computed(() =>
  routesData
    .filter(r => r.mode === activeMode.value)
    .map(route => {
      const branchObjects = route.branches.map(code => branchesByCode[code]).filter(Boolean)
      const visited = branchObjects.filter(b => passport.hasVisited(b.BranchCode)).length
      return {
        ...route,
        branchObjects,
        visited,
        total: branchObjects.length,
        mapsUrl: mapsUrl(branchObjects),
      }
    })
)

// ── Sheets ────────────────────────────────────────────────────────────
const directoryOpen   = ref(false)
const branchSheetOpen = ref(false)
const activeBranch    = ref(null)
const branchSheetHeight = 'calc(100dvh - var(--nav-height) - 60px)'

function openBranchSheet(branch) {
  activeBranch.value = branch
  branchSheetOpen.value = true
}

function openFromDirectory(branch) {
  directoryOpen.value = false
  nextTick(() => openBranchSheet(branch))
}

// ── Directory ─────────────────────────────────────────────────────────
const query       = ref('')
const visitFilter = ref(null)
const byDistrict  = ref(false)

watch(directoryOpen, open => { if (!open) query.value = '' })

const filteredBranches = computed(() => {
  let list = physicalBranches
  if (query.value) {
    const q = query.value.toLowerCase()
    list = list.filter(b =>
      b.BranchName.toLowerCase().includes(q) ||
      b.NBHDName?.toLowerCase().includes(q) ||
      b.Address?.toLowerCase().includes(q)
    )
  }
  if (visitFilter.value === 'unvisited') list = list.filter(b => !passport.hasVisited(b.BranchCode))
  if (visitFilter.value === 'visited')   list = list.filter(b => passport.hasVisited(b.BranchCode))
  return [...list].sort((a, b) => a.BranchName.localeCompare(b.BranchName))
})

const byRegion = computed(() => {
  const map = {}
  for (const d of DISTRICT_ORDER) map[d] = []
  for (const b of filteredBranches.value) {
    if (b.District) map[b.District]?.push(b)
  }
  return map
})

const visibleDistricts = computed(() =>
  DISTRICT_ORDER.filter(d => byRegion.value[d]?.length > 0)
)
</script>

<style scoped>
/* ── Page header ─────────────────────────────────────────────────── */
.page-header {
  padding: 20px 0 14px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.page-header h1 { margin-bottom: 3px; }

.sub {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.search-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s, background 0.15s;
}
.search-btn svg { width: 18px; height: 18px; }
.search-btn:active { background: var(--color-paper); border-color: var(--tpl-blue); }

/* ── Sections ────────────────────────────────────────────────────── */
.explore-section {
  margin-bottom: 28px;
}


/* ── Tab bar ─────────────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  margin: 0 -18px 20px;
  padding: 0 18px;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1.5px solid var(--color-border-soft);
}

.tab-bar::-webkit-scrollbar { display: none; }

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

.tab-pill--active {
  color: var(--tpl-navy);
  border-bottom-color: var(--tpl-navy);
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

@keyframes spin { to { transform: rotate(360deg); } }

.near-me-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.branch-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s;
  width: 100%;
}

.branch-card:active {
  background: var(--color-paper);
  border-color: var(--color-border);
}

.card-stamp {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.card-stamp--ghost {
  opacity: 0.35;
  filter: grayscale(1);
}

.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-name {
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.card-chevron {
  width: 16px;
  height: 16px;
  stroke: var(--color-border);
  flex-shrink: 0;
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

.suggestion-badge--octagon { clip-path: polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%); }
.suggestion-badge--circle  { border-radius: 50%; }
.suggestion-badge--star    { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }

.suggestion-badge-label {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.suggestion-body { flex: 1; min-width: 0; }

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.suggestion-title {
  font-size: 0.8rem;
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
  font-size: 0.82rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  margin: 0 0 8px;
}

.suggestion-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.branch-chip {
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--tpl-blue);
  background: transparent;
  color: var(--tpl-blue);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}

.branch-chip:active {
  background: color-mix(in srgb, var(--tpl-blue) 12%, transparent);
}

/* ── Browse CTA ──────────────────────────────────────────────────── */
.browse-cta {
  padding: 4px 0 8px;
}

.browse-btn {
  width: 100%;
  padding: 13px;
  border-radius: var(--radius);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s;
}

.browse-btn:active {
  border-color: var(--tpl-blue);
  color: var(--tpl-blue);
}

/* ── Sheet shared ────────────────────────────────────────────────── */
:global(.sheet-overlay) {
  position: fixed;
  top: 0; left: 0; right: 0;
  bottom: var(--nav-height);
  background: rgba(0, 0, 0, 0.42);
  z-index: 90;
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

.sheet-scroll {
  height: calc(100% - 48px);
  overflow-y: auto;
  padding: 0 20px 32px;
}

/* ── Branch detail sheet ─────────────────────────────────────────── */
:global(.explore-branch-sheet) {
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

/* ── Directory sheet ─────────────────────────────────────────────── */
:global(.directory-sheet) {
  position: fixed;
  bottom: var(--nav-height) !important;
  left: 0; right: 0;
  margin: 0 auto;
  max-width: 480px;
  height: calc(100dvh - var(--nav-height) - 20px);
  background: var(--color-bg) !important;
  border-radius: 20px 20px 0 0;
  z-index: 90;
  overflow: hidden;
  outline: none;
  display: flex;
  flex-direction: column;
}

.directory-inner {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0 18px;
}

.directory-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.directory-title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
}

.directory-count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.search-wrap {
  position: relative;
  margin-bottom: 10px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 11px 14px 11px 38px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s;
}

.search-input:focus { border-color: var(--tpl-blue); }

.pill-bar {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 6px;
  align-items: center;
  margin: 0 -18px;
  padding: 2px 18px 10px;
  scrollbar-width: none;
}

.pill-bar::-webkit-scrollbar { display: none; }

.pill-divider {
  width: 1px;
  height: 18px;
  background: var(--color-border);
  flex-shrink: 0;
}

.sort-tab {
  flex-shrink: 0;
  padding: 6px 13px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.8rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.sort-tab--active {
  background: var(--tpl-navy);
  border-color: var(--tpl-navy);
  color: #fff;
}

.directory-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;
}

.region-group { margin-bottom: 24px; }

.branch-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.mode-bar::-webkit-scrollbar { display: none; }

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
  font-size: 0.7rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.mode-tab--active {
  color: var(--tpl-navy);
  border-bottom-color: var(--tpl-navy);
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
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s;
}

.route-card:active {
  background: var(--color-paper);
  border-color: var(--color-border);
}

.route-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.route-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
}

.route-chevron {
  width: 16px;
  height: 16px;
  stroke: var(--color-border);
  flex-shrink: 0;
}

.route-meta {
  font-size: 0.775rem;
  color: var(--color-text-muted);
  margin: 0 0 10px;
  line-height: 1;
}

.route-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.route-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.route-fill {
  height: 100%;
  background: var(--tpl-blue);
  border-radius: 2px;
  min-width: 2px;
}

.route-count {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.route-count--done { color: var(--tpl-blue); }

.coming-soon {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 24px 0;
  text-align: center;
}
</style>
