<template>
  <main class="page-content">
    <header class="page-header">
      <NuxtLink to="/explore" class="back-link">
        <IconBack />
        Explore
      </NuxtLink>
      <div>
        <h1>All Branches</h1>
        <p class="sub">{{ filteredBranches.length }} of {{ physicalBranches.length }}</p>
      </div>
    </header>

    <div class="controls">
      <div class="search-wrap">
        <IconSearch />
        <input v-model="query" type="search" placeholder="Search by name or neighbourhood…" class="search-input" />
      </div>
      <div class="pill-bar">
        <button class="sort-tab" :class="{ 'sort-tab-active': visitFilter === 'unvisited' }"
                @click="visitFilter = visitFilter === 'unvisited' ? null : 'unvisited'"
        >
          Unvisited
        </button>
        <button class="sort-tab" :class="{ 'sort-tab-active': visitFilter === 'visited' }"
                @click="visitFilter = visitFilter === 'visited' ? null : 'visited'"
        >
          Visited
        </button>
      </div>
    </div>
    <ul class="branch-list">
      <li v-for="branch in filteredBranches" :key="branch.BranchCode">
        <BranchCard :branch="branch" as-button @select="openSheet" />
      </li>
    </ul>
  </main>

  <!-- Branch detail sheet -->
  <BaseSheet v-model:open="sheetOpen" :height="sheetHeight">
    <BranchDetail v-if="activeBranch" :branch="activeBranch" source="explore" @open-branch="openSheet" />
  </BaseSheet>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'
import IconSearch from '~/components/icons/IconSearch.vue'
import IconBack from '~/components/icons/IconBack.vue'

const { $posthog } = useNuxtApp()
const passport = usePassportStore()

const query = ref('')
const visitFilter = ref(null)

// Debounced search tracking — fires on pause, not every keystroke
let searchTimer = null
watch(query, (val) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    $posthog?.capture('explore_searched', { query_length: val.length })
  }, 600)
})

watch(visitFilter, (val) => {
  $posthog?.capture('explore_filter_changed', { filter: val ?? 'az' })
})

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
  if (visitFilter.value === 'visited') list = list.filter(b => passport.hasVisited(b.BranchCode))
  return [...list].sort((a, b) => a.BranchName.localeCompare(b.BranchName))
})

// Sheet
const sheetOpen = ref(false)
const activeBranch = ref(null)
const sheetHeight = 'calc(100svh - var(--nav-height) - 60px)'

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

.back-link svg {
  width: 16px;
  height: 16px;
}

.page-header h1 {
  margin-bottom: 3px;
}

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

.search-wrap {
  position: relative;
}

.search-wrap svg {
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

.search-input:focus {
  border-color: var(--tpl-blue);
}

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

.pill-bar::-webkit-scrollbar {
  display: none;
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

.branch-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}
</style>
