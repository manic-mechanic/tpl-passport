<template>
  <div class="explore-branches">
    <div class="search-bar">
      <IconSearch class="search-icon" />
      <input v-model="query" type="search" placeholder="Search branches" aria-label="Search branches"
             class="search-input"
      />
      <div class="bar-actions">
        <button v-if="showNearButton" class="bar-btn" :class="{ 'bar-btn-on': nearMe }" :aria-pressed="nearMe"
                aria-label="Sort by distance" :disabled="locating" @click="toggleNearMe"
        >
          <span v-if="locating" class="bar-spinner" />
          <svg v-else viewBox="0 0 24 24" :fill="nearMe ? 'currentColor' : 'none'" stroke="currentColor"
               stroke-width="2" stroke-linejoin="round" aria-hidden="true"
          >
            <path d="M20 4 4 11.2l6.8 2 2 6.8L20 4z" />
          </svg>
        </button>
        <div v-if="hasCheckIns" ref="filterWrap" class="filter-wrap">
          <button class="bar-btn" :class="{ 'bar-btn-on': visitFilter !== 'all' }" aria-label="Filter by visits"
                  :aria-expanded="filterOpen" aria-haspopup="menu" @click="filterOpen = !filterOpen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                 aria-hidden="true"
            >
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
          <div v-if="filterOpen" class="filter-menu" role="menu">
            <button v-for="opt in FILTERS" :key="opt.id" class="filter-option" role="menuitemradio"
                    :aria-checked="visitFilter === opt.id" @click="visitFilter = opt.id; filterOpen = false"
            >
              {{ opt.label }}
              <IconCheckMark v-if="visitFilter === opt.id" class="filter-check" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <button v-if="showLocatePrompt" class="locate-link" :disabled="locating" @click="toggleNearMe">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"
           aria-hidden="true"
      >
        <path d="M20 4 4 11.2l6.8 2 2 6.8L20 4z" />
      </svg>
      {{ locating ? 'Finding your location…' : 'Sort by distance from you' }}
    </button>

    <p v-if="locateFailed" class="locate-failed" role="status">Couldn't get your location. Try again.</p>

    <ul class="branch-list">
      <li v-for="item in visible" :key="item.branch.BranchCode">
        <BranchCard :branch="item.branch" :distance="item.distance" as-button @select="$emit('select', $event)" />
      </li>
    </ul>

    <button v-if="moreCount" class="more-btn" @click="limit += PAGE">
      Show {{ moreCount }} more
    </button>

    <p v-if="!visible.length" class="empty">No branches match.</p>
  </div>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { usePassportStore } from '~/stores/passport'
import { sortedBranches, haversineKm, formatDist } from '~/composables/useRegion'
import { cachedPosition, getPosition, locationAccess, type Coords, type LocationAccess } from '~/lib/geolocation'
import IconSearch from '~/components/icons/IconSearch.vue'
import IconCheckMark from '~/components/icons/IconCheckMark.vue'

defineEmits<{ select: [branch: Branch] }>()

const PAGE = 5
const { $posthog } = useNuxtApp()
const passport = usePassportStore()

type VisitFilter = 'all' | 'visited' | 'unvisited'
const FILTERS: { id: VisitFilter, label: string }[] = [
  { id: 'all', label: 'All branches' },
  { id: 'visited', label: 'Visited' },
  { id: 'unvisited', label: 'Not visited' },
]

const query = ref('')
const visitFilter = ref<VisitFilter>('all')
const filterOpen = ref(false)
const filterWrap = ref<HTMLElement | null>(null)
const nearMe = ref(false)
const limit = ref(PAGE)

const access = ref<LocationAccess>('unknown')
const position = ref<Coords | null>(null)
const locating = ref(false)
const locateFailed = ref(false)
// Set while the list turns on Near Me by itself, so analytics only count taps.
let autoNearMe = false

const hasCheckIns = computed(() => passport.checkIns.length > 0)
const showNearButton = computed(() => access.value !== 'denied' && access.value !== 'unavailable')
// Until this device has shared its location, a quiet line under search
// offers it. Gone once we have a position.
const showLocatePrompt = computed(() => access.value === 'unknown' && !position.value && !nearMe.value)

// Close the filter menu on a tap anywhere else.
function onDocPointer(e: PointerEvent) {
  if (filterOpen.value && !filterWrap.value?.contains(e.target as Node)) filterOpen.value = false
}
onMounted(() => document.addEventListener('pointerdown', onDocPointer))
onUnmounted(() => document.removeEventListener('pointerdown', onDocPointer))

// Open sorted by distance when we already have a position, or can get one
// without a prompt (access granted). Never prompts on load.
onMounted(async () => {
  access.value = await locationAccess()
  const cached = cachedPosition()
  if (cached) {
    position.value = cached
  } else if (access.value === 'granted') {
    try {
      position.value = await getPosition({ timeout: 20000 })
    } catch {
      return  // stay A–Z; the locate button still works
    }
  }
  // Don't override a choice the user made while we waited.
  if (position.value && !nearMe.value && !locating.value) {
    autoNearMe = true
    nearMe.value = true
  }
})

async function toggleNearMe() {
  if (nearMe.value) {
    nearMe.value = false
    return
  }
  locateFailed.value = false
  if (!position.value) {
    locating.value = true
    try {
      position.value = await getPosition({ timeout: 20000 })
      access.value = 'granted'
    } catch (err) {
      if ((err as GeolocationPositionError | undefined)?.code === 1) access.value = 'denied'
      else locateFailed.value = true
      return
    } finally {
      locating.value = false
    }
  }
  nearMe.value = true
  limit.value = PAGE
}

watch([nearMe, visitFilter], ([near, filter]) => {
  if (autoNearMe) {
    autoNearMe = false
    return
  }
  $posthog?.capture('explore_filter_changed', { near_me: near, filter })
})

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(query, (val) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => $posthog?.capture('explore_searched', { query_length: val.length }), 600)
})

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  const onlyVisited = visitFilter.value === 'visited'
  const onlyUnvisited = visitFilter.value === 'unvisited'
  return sortedBranches.filter((b) => {
    if (q && !(b.BranchName.toLowerCase().includes(q) || b.NBHDName?.toLowerCase().includes(q)
      || b.Address?.toLowerCase().includes(q))) return false
    const visited = passport.hasVisited(b.BranchCode)
    if (onlyVisited && !visited) return false
    if (onlyUnvisited && visited) return false
    return true
  })
})

// Near me: closest first, PAGE at a time. A search shows every match.
const ranked = computed(() => {
  const pos = position.value
  const list = filtered.value.map(branch => ({
    branch,
    km: pos ? haversineKm(pos.latitude, pos.longitude, branch.Lat, branch.Long) : null,
  }))
  if (nearMe.value) list.sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
  return list.map(item => ({
    branch: item.branch,
    distance: nearMe.value && item.km !== null ? formatDist(item.km) : null,
  }))
})

const capped = computed(() => nearMe.value && !query.value.trim())
const visible = computed(() => capped.value ? ranked.value.slice(0, limit.value) : ranked.value)
const moreCount = computed(() =>
  capped.value ? Math.min(PAGE, ranked.value.length - visible.value.length) : 0
)
</script>

<style scoped>
.search-bar {
  /* The buttons sit 4px in from the top, right and bottom edges, with
     corners 4px tighter than the bar's, so the curves stay parallel. */
  --bar-inset: 4px;

  position: relative;
  display: flex;
  align-items: center;
  height: 44px;
  margin-bottom: 16px;
  padding-right: var(--bar-inset);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  transition: border-color 0.15s;

  &:focus-within {
    border-color: var(--tpl-blue);
  }
}

.search-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-left: 12px;
  color: var(--color-text-muted);
}

.search-input {
  flex: 1;
  align-self: stretch;
  min-width: 0;
  padding: 0 8px;
  border: none;
  background: none;
  font-size: 1rem;
  font-family: var(--font-body);
  color: var(--color-text);
  outline: none;
}

.bar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: calc(var(--radius) - var(--bar-inset));
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.15s, color 0.15s;

  & svg {
    width: 18px;
    height: 18px;
  }

  &.bar-btn-on {
    color: var(--tpl-blue);
    background: color-mix(in srgb, var(--tpl-blue) 8%, transparent);
    border-color: color-mix(in srgb, var(--tpl-blue) 22%, transparent);
  }
}

.bar-actions {
  display: flex;
  gap: 2px;
}

.locate-failed {
  margin: -6px 0 14px;
  font-size: 0.8125rem;
  color: var(--color-error);
}

.locate-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: -6px 0 14px;
  padding: 4px 2px;
  background: none;
  border: none;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--tpl-blue);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  & svg {
    width: 14px;
    height: 14px;
  }

  &:disabled {
    color: var(--color-text-muted);
    cursor: default;
  }
}

.bar-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--tpl-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.filter-wrap {
  position: relative;
}

.filter-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: -4px;
  z-index: 10;
  min-width: 180px;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.08);
}

.filter-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  background: none;
  font-size: 0.9375rem;
  font-family: var(--font-body);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;

  &:active {
    background: var(--color-paper);
  }
}

.filter-check {
  width: 16px;
  height: 16px;
  color: var(--tpl-blue);
}

.branch-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.more-btn {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 12px;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--tpl-blue);
  cursor: pointer;
}

.empty {
  padding: 24px 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
</style>
