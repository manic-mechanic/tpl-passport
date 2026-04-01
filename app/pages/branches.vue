<template>
  <main class="page-content">

    <header class="page-header">
      <NuxtLink to="/explore" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Explore
      </NuxtLink>
      <div>
        <h1>All Branches</h1>
        <p class="sub">{{ filteredBranches.length }} of {{ physicalBranches.length }}</p>
      </div>
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
        <button class="sort-tab" :class="{ 'sort-tab-active': visitFilter === 'unvisited' }" @click="visitFilter = visitFilter === 'unvisited' ? null : 'unvisited'">Unvisited</button>
        <button class="sort-tab" :class="{ 'sort-tab-active': visitFilter === 'visited' }" @click="visitFilter = visitFilter === 'visited' ? null : 'visited'">Visited</button>
        <span class="pill-divider" />
        <button class="sort-tab" :class="{ 'sort-tab-active': byDistrict }" @click="byDistrict = !byDistrict">District</button>
      </div>
    </div>

    <template v-if="byDistrict">
      <div v-for="district in visibleDistricts" :key="district" class="region-group">
        <p class="section-label">{{ district }}</p>
        <ul class="branch-list">
          <li v-for="branch in byRegion[district]" :key="branch.BranchCode">
            <BranchCard :branch="branch" as-button @select="openSheet" />
          </li>
        </ul>
      </div>
    </template>
    <ul v-else class="branch-list">
      <li v-for="branch in filteredBranches" :key="branch.BranchCode">
        <BranchCard :branch="branch" as-button @select="openSheet" />
      </li>
    </ul>

  </main>

  <!-- Branch detail sheet -->
  <BaseSheet v-model:open="sheetOpen" :height="sheetHeight">
    <BranchDetail v-if="activeBranch" :branch="activeBranch" />
  </BaseSheet>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, DISTRICT_ORDER } from '~/composables/useRegion'

const passport = usePassportStore()

const query       = ref('')
const visitFilter = ref(null)
const byDistrict  = ref(false)

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

// Sheet
const sheetOpen    = ref(false)
const activeBranch = ref(null)
const sheetHeight  = 'calc(100dvh - var(--nav-height) - 60px)'

function openSheet(branch) {
  activeBranch.value = branch
  sheetOpen.value = true
}
</script>

<style scoped>
.page-header {
  padding: 16px 0 14px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tpl-blue);
  text-decoration: none;
  margin-bottom: 6px;
}
.back-link svg { width: 16px; height: 16px; }

.page-header h1 { margin-bottom: 3px; }

.sub {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.search-wrap { position: relative; }

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
  padding: 2px 18px;
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
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
  &.sort-tab-active {
    background: var(--tpl-navy);
    border-color: var(--tpl-navy);
    color: #fff;
  }
}

.region-group { margin-bottom: 24px; }

.branch-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

</style>
