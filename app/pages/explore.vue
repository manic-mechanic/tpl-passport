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
      <!-- No location yet: a prompt card above the full branch list -->
      <div v-if="geoStatus !== 'ready'" class="locate-card">
        <button class="locate-card-stamp" :disabled="geoStatus === 'loading'" aria-label="Find branches near me"
                @click="locate"
        >
          <LocateStamp :size="64" :busy="geoStatus === 'loading'" />
        </button>
        <div class="locate-card-body">
          <p class="locate-card-title">Find branches near you</p>
          <p class="locate-card-text">{{ locateCardText }}</p>
          <button v-if="geoStatus !== 'denied' || hasGeolocation" class="locate-card-btn"
                  :disabled="geoStatus === 'loading'" @click="locate"
          >
            {{ geoStatus === 'loading' ? 'Finding you…' : geoStatus === 'idle' && !geoTimedOut ? 'Use my location' : 'Try again' }}
          </button>
        </div>
      </div>

      <!-- Located: switch between the closest few and every branch by distance -->
      <div v-else class="near-toggle" role="tablist" aria-label="Branches near you">
        <button class="near-toggle-btn" :class="{ active: nearView === 'closest' }" role="tab"
                :aria-selected="nearView === 'closest'" @click="nearView = 'closest'"
        >
          Closest
        </button>
        <button class="near-toggle-btn" :class="{ active: nearView === 'all' }" role="tab"
                :aria-selected="nearView === 'all'" @click="nearView = 'all'"
        >
          All branches
        </button>
      </div>

      <div class="near-me-list">
        <BranchCard v-for="item in nearMeList" :key="item.branch.BranchCode" :branch="item.branch"
                    :distance="item.distanceLabel" as-button @select="openBranchSheet"
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
import IconSearch from '~/components/icons/IconSearch.vue'
import { cachedPosition, getPosition, locationPermission } from '~/lib/geolocation'

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
// idle: waiting for a tap on "Use my location", so opening Explore doesn't
// bring up the location prompt by itself.
const geoStatus = ref<'idle' | 'loading' | 'ready' | 'denied'>('idle')
const geoTimedOut = ref(false)
const hasGeolocation = import.meta.client && !!navigator?.geolocation
const nearView = ref<'closest' | 'all'>('closest')

const locateCardText = computed(() => {
  if (geoStatus.value === 'denied') {
    return hasGeolocation
      ? 'Location access is off. Allow it in your browser settings, then try again.'
      : "This device can't share its location."
  }
  if (geoTimedOut.value) return "Couldn't get your location in time."
  return "We'll show the closest branches and how far away each one is."
})

watch(nearView, (view) => {
  $posthog?.capture('near_me_view_changed', { view })
})

async function locate() {
  if (geoStatus.value === 'loading') return
  geoStatus.value = 'loading'
  geoTimedOut.value = false
  try {
    const pos = await getPosition({ timeout: 20000 })
    userLat.value = pos.latitude
    userLng.value = pos.longitude
    geoStatus.value = 'ready'
  } catch (err) {
    // A slow GPS fix isn't a refusal: offer a retry instead of the
    // "allow location access" message.
    if ((err as GeolocationPositionError | undefined)?.code === 3) {
      geoTimedOut.value = true
      geoStatus.value = 'idle'
    } else {
      geoStatus.value = 'denied'
    }
  }
}

// Load Near Me straight away only when it won't prompt: a recent position is
// cached, or access is already granted.
onMounted(async () => {
  if (!navigator?.geolocation) {
    geoStatus.value = 'denied'
    return
  }
  if (cachedPosition()) return void locate()
  const permission = await locationPermission()
  if (permission === 'granted') void locate()
  else if (permission === 'denied') geoStatus.value = 'denied'
  else geoStatus.value = 'idle'
})

// Before we have a location, the full A–Z list.
const nearMeList = computed(() => {
  if (geoStatus.value !== 'ready') {
    return sortedBranches.map(branch => ({ branch, distanceLabel: null as string | null }))
  }
  return nearView.value === 'closest' ? nearMeBranches.value : allByDistance.value
})

const allByDistance = computed(() => {
  const lat = userLat.value
  const lng = userLng.value
  if (lat === null || lng === null) return []
  return physicalBranches
    .map(branch => ({ branch, km: haversineKm(lat, lng, branch.Lat, branch.Long) }))
    .sort((a, b) => a.km - b.km)
    .map(item => ({ branch: item.branch, distanceLabel: formatDist(item.km) as string | null }))
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
.locate-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
}

.locate-card-stamp {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:disabled {
    cursor: default;
  }
}

.locate-card-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.locate-card-title {
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-text);
}

.locate-card-text {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--color-text-muted);
}

.locate-card-btn {
  margin-top: 8px;
  padding: 9px 16px;
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 700;
  font-family: var(--font-body);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s, opacity 0.15s;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  &:not(:disabled):active {
    transform: scale(0.97);
  }
}

.near-toggle {
  display: inline-flex;
  padding: 3px;
  margin-bottom: 14px;
  background: color-mix(in srgb, var(--tpl-blue) 7%, var(--color-surface));
  border: 1px solid var(--color-border-soft);
  border-radius: 999px;
}

.near-toggle-btn {
  padding: 7px 16px;
  background: none;
  border: none;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, color 0.15s;

  &.active {
    background: var(--color-surface);
    color: var(--color-brand-text);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
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
