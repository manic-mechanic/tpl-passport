<template>
  <main class="page-content">
    <header class="page-header">
      <h1>Explore</h1>
      <p class="sub">{{ filteredBranches.length }} {{ visitFilter ? visitFilter : '' }} branches{{ visitFilter === 'unvisited' ? ' left to go' : ' across Toronto' }}</p>
    </header>

    <div class="controls">
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
        <button
          class="sort-tab"
          :class="{ 'sort-tab--active': sort === 'alpha' }"
          @click="selectSort('alpha')"
        >A–Z</button>
        <button
          class="sort-tab"
          :class="{ 'sort-tab--active': sort === 'nearby' }"
          @click="selectSort('nearby')"
        >
          <span v-if="geoStatus === 'loading'" class="geo-spinner" />
          Nearby
        </button>
        <span class="pill-divider" />
        <button
          class="sort-tab"
          :class="{ 'sort-tab--active': visitFilter === 'unvisited' }"
          @click="visitFilter = visitFilter === 'unvisited' ? null : 'unvisited'"
        >Unvisited</button>
        <button
          class="sort-tab"
          :class="{ 'sort-tab--active': visitFilter === 'visited' }"
          @click="visitFilter = visitFilter === 'visited' ? null : 'visited'"
        >Visited</button>
        <button
          class="sort-tab"
          :class="{ 'sort-tab--active': byDistrict }"
          @click="byDistrict = !byDistrict"
        >District</button>
      </div>

      <p v-if="geoStatus === 'denied'" class="geo-error">
        Location unavailable — {{ navigator?.geolocation ? 'allow location access in browser settings' : 'geolocation requires HTTPS or localhost' }}.
      </p>
    </div>

    <!-- Flat list -->
    <ul v-if="!byDistrict" class="branch-list">
      <li v-for="branch in filteredBranches" :key="branch.BranchCode">
        <BranchRow :branch="branch" :distance="distanceMap[branch.BranchCode] ?? null" />
      </li>
    </ul>

    <!-- Grouped by district -->
    <template v-else>
      <div v-for="district in visibleDistricts" :key="district" class="region-group">
        <p class="section-label">{{ district }}</p>
        <ul class="branch-list">
          <li v-for="branch in byRegion[district]" :key="branch.BranchCode">
            <BranchRow :branch="branch" :distance="distanceMap[branch.BranchCode] ?? null" />
          </li>
        </ul>
      </div>
    </template>

  </main>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, DISTRICT_ORDER, haversineKm } from '~/composables/useRegion'

const passport     = usePassportStore()
const query        = ref('')
const sort         = ref('alpha')
const visitFilter  = ref(null) // null | 'unvisited' | 'visited'
const byDistrict   = ref(false)

// Geolocation state
const userLat   = ref(null)
const userLng   = ref(null)
const geoStatus = ref('idle') // 'idle' | 'loading' | 'ready' | 'denied'

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function selectSort(value) {
  if (value === 'nearby' && geoStatus.value === 'idle') {
    if (!navigator?.geolocation) {
      geoStatus.value = 'denied'
      return
    }
    geoStatus.value = 'loading'
    navigator.geolocation.getCurrentPosition(
      pos => {
        userLat.value = pos.coords.latitude
        userLng.value = pos.coords.longitude
        geoStatus.value = 'ready'
        sort.value = 'nearby'
      },
      () => {
        geoStatus.value = 'denied'
        sort.value = 'alpha'
      }
    )
    return
  }
  sort.value = value
}

function sortedList(list) {
  if (sort.value === 'nearby' && userLat.value !== null) {
    return [...list].sort((a, b) =>
      haversineKm(userLat.value, userLng.value, a.Lat, a.Long) -
      haversineKm(userLat.value, userLng.value, b.Lat, b.Long)
    )
  }
  return [...list].sort((a, b) => a.BranchName.localeCompare(b.BranchName))
}

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
  return sortedList(list)
})

const distanceMap = computed(() => {
  if (sort.value !== 'nearby' || userLat.value === null) return {}
  const map = {}
  for (const b of physicalBranches) {
    map[b.BranchCode] = formatDistance(haversineKm(userLat.value, userLng.value, b.Lat, b.Long))
  }
  return map
})

const byRegion = computed(() => {
  const map = {}
  for (const d of DISTRICT_ORDER) map[d] = []
  for (const b of filteredBranches.value) {
    if (b.District) map[b.District]?.push(b)
  }
  // filteredBranches is already sorted — preserve that order within groups
  return map
})

const visibleDistricts = computed(() => {
  const districts = DISTRICT_ORDER.filter(d => byRegion.value[d]?.length > 0)
  if (sort.value !== 'nearby' || userLat.value === null) return districts
  return [...districts].sort((a, b) => {
    const nearestA = haversineKm(userLat.value, userLng.value, byRegion.value[a][0].Lat, byRegion.value[a][0].Long)
    const nearestB = haversineKm(userLat.value, userLng.value, byRegion.value[b][0].Lat, byRegion.value[b][0].Long)
    return nearestA - nearestB
  })
})
</script>

<style scoped>
.page-header {
  padding: 20px 0 14px;
}

.page-header h1 { margin-bottom: 3px; }

.sub {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.controls {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-wrap {
  position: relative;
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
  font-size: 1rem; /* 16px minimum prevents iOS Safari auto-zoom on focus */
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
  /* extend to page edges so pills scroll under the gutter */
  margin: 0 -16px;
  padding: 2px 16px;
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

.geo-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
  margin-right: 2px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.geo-error {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin: 2px 0 0;
}

.region-group { margin-bottom: 24px; }

.branch-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
