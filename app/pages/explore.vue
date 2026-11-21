<template>
  <main class="page-content" :class="{ 'has-browse-cta': activeTab === 'near-me' }">
    <!-- Sticky header + tabs -->
    <PageBanner title="Explore">
      <template #action>
        <NuxtLink to="/branches" class="search-btn" aria-label="Browse all branches">
          <IconSearch />
        </NuxtLink>
      </template>

      <!-- Tab pills -->
      <nav class="tab-bar" role="tablist">
        <button class="tab-pill" :class="{ active: activeTab === 'near-me' }" role="tab"
                :aria-selected="activeTab === 'near-me'" @click="activeTab = 'near-me'"
        >
          Near me
        </button>
        <button class="tab-pill" :class="{ active: activeTab === 'routes' }" role="tab"
                :aria-selected="activeTab === 'routes'" @click="activeTab = 'routes'"
        >
          Day trips
        </button>
        <button class="tab-pill" :class="{ active: activeTab === 'events' }" role="tab"
                :aria-selected="activeTab === 'events'" @click="activeTab = 'events'"
        >
          What's on
        </button>
        <button class="tab-pill" :class="{ active: activeTab === 'working-toward' }" role="tab"
                :aria-selected="activeTab === 'working-toward'" @click="activeTab = 'working-toward'"
        >
          Extra Credit
        </button>
      </nav>
    </PageBanner>

    <!-- Near Me -->
    <section v-show="activeTab === 'near-me'" class="explore-section">
      <div v-if="geoStatus === 'loading'" class="geo-state">
        <span class="geo-spinner" />
        <span>Finding branches near you…</span>
      </div>

      <div v-else-if="geoStatus === 'ready'" class="near-me-list">
        <BranchCard v-for="item in nearMeBranches" :key="item.branch.BranchCode" :branch="item.branch"
                    :distance="item.distanceLabel" as-button @select="openBranchSheet"
        />
      </div>

      <!-- No location: every branch, A–Z. Explore never prompts for location
           on its own; that waits for the Explore redesign. -->
      <div v-else class="near-me-list">
        <BranchCard v-for="branch in sortedBranches" :key="branch.BranchCode" :branch="branch"
                    as-button @select="openBranchSheet"
        />
      </div>
    </section>

    <!-- Working Toward -->
    <section v-show="activeTab === 'working-toward'" class="explore-section">
      <ExploreBadgeSuggestions @open-branch="openBranchSheet" />
    </section>

    <!-- Day Trips -->
    <section v-show="activeTab === 'routes'" class="explore-section">
      <ExploreDayTrips />
    </section>

    <!-- What's On -->
    <section v-show="activeTab === 'events'" class="explore-section">
      <ExploreEvents :user-lat="userLat" :user-lng="userLng" @open-branch="openBranchSheet" />
    </section>

    <!-- Browse All CTA -->
    <div v-if="activeTab === 'near-me'" class="browse-cta">
      <NuxtLink to="/branches" class="browse-btn">Browse all branches</NuxtLink>
    </div>
  </main>

  <!-- Branch detail sheet -->
  <BaseSheet v-model:open="branchSheetOpen" :height="branchSheetHeight">
    <BranchDetail v-if="activeBranch" :branch="activeBranch" source="explore" @open-branch="openBranchSheet" />
  </BaseSheet>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, sortedBranches, haversineKm, formatDist } from '~/composables/useRegion'
import { cachedPosition, getPosition, locationAccess } from '~/lib/geolocation'
import IconSearch from '~/components/icons/IconSearch.vue'

const { $posthog } = useNuxtApp()
const passport = usePassportStore()

// ── Tab state ────────────────────────────────────────────────────────
const route = useRoute()
const activeTab = ref<'routes' | 'events' | 'working-toward' | 'near-me'>(
  route.query.tab === 'routes' ? 'routes'
    : route.query.tab === 'events' ? 'events'
      : route.query.tab === 'working-toward' ? 'working-toward'
        : 'near-me'
)

watch(activeTab, (tab) => {
  $posthog?.capture('explore_tab_changed', { tab })
})

// ── Near Me ──────────────────────────────────────────────────────────
const userLat = ref<number | null>(null)
const userLng = ref<number | null>(null)
const geoStatus = ref<'loading' | 'ready' | 'none'>('none')

// Near Me loads only when it won't bring up a prompt by itself: a recent
// position is cached, or this device has allowed location (see
// locationAccess). Otherwise the tab lists every branch.
onMounted(async () => {
  if (!cachedPosition() && await locationAccess() !== 'granted') return
  geoStatus.value = 'loading'
  try {
    const pos = await getPosition({ timeout: 20000 })
    userLat.value = pos.latitude
    userLng.value = pos.longitude
    geoStatus.value = 'ready'
  } catch {
    geoStatus.value = 'none'
  }
})

const nearMeBranches = computed(() => {
  const lat = userLat.value
  const lng = userLng.value
  if (geoStatus.value !== 'ready' || lat === null || lng === null) return []
  const withDistance = physicalBranches
    .map(b => ({
      branch: b,
      km: haversineKm(lat, lng, b.Lat, b.Long),
      visited: passport.hasVisited(b.BranchCode),
    }))
    .sort((a, b) => a.km - b.km)

  const nearest = withDistance[0]
  if (!nearest) return []
  const unvisited = withDistance
    .filter(item => !item.visited && item.branch.BranchCode !== nearest.branch.BranchCode)
    .slice(0, 4)

  return [nearest, ...unvisited].map(item => ({ ...item, distanceLabel: formatDist(item.km) }))
})

// ── Sheets ────────────────────────────────────────────────────────────
const branchSheetOpen = ref(false)
const activeBranch = ref<Branch | null>(null)
const branchSheetHeight = 'calc(100svh - var(--nav-height) - 60px)'

function openBranchSheet(branch: Branch) {
  activeBranch.value = branch
  branchSheetOpen.value = true
}
</script>

<style scoped>
.page-content {
  padding-bottom: var(--nav-height);
}

/* Extra bottom padding only when browse button is visible (Near Me tab) */
.page-content.has-browse-cta {
  padding-bottom: calc(var(--nav-height) + 72px);
}

/* ── Sticky header block ─────────────────────────────────────────── */
/* ── Page header ─────────────────────────────────────────────────── */
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
    color: var(--color-brand-text);
    border-bottom-color: var(--color-brand-text);
  }
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

</style>
