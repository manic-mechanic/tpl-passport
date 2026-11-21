<template>
  <div class="explore-branches">
    <div class="controls" :class="`controls-${layout}`">
      <div class="search-wrap">
        <IconSearch />
        <input v-model="query" type="search" placeholder="Search branches" aria-label="Search branches"
               class="search-input"
        />
      </div>

      <div class="chips" role="group" aria-label="Filter branches">
        <button v-if="showNearChip" class="chip" :class="{ 'chip-on': nearMe }" :aria-pressed="nearMe"
                :disabled="locating" @click="toggleNearMe"
        >
          <span v-if="locating" class="chip-spinner" />
          <svg v-else-if="!located" class="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          Near me
        </button>
        <template v-if="hasCheckIns">
          <button class="chip" :class="{ 'chip-on': showVisited }" :aria-pressed="showVisited"
                  @click="showVisited = !showVisited"
          >
            Visited
          </button>
          <button class="chip" :class="{ 'chip-on': showUnvisited }" :aria-pressed="showUnvisited"
                  @click="showUnvisited = !showUnvisited"
          >
            Not visited
          </button>
        </template>
      </div>
    </div>

    <button v-if="prompt === 'row' && showNearChip && !located && !nearMe" class="near-row" :disabled="locating"
            @click="toggleNearMe"
    >
      Sort by distance from you
      <IconChevron class="near-row-chevron" />
    </button>

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
import IconChevron from '~/components/icons/IconChevron.vue'

// Mockup switches, removed once a layout is chosen.
withDefaults(defineProps<{ layout?: 'inline' | 'stacked', prompt?: 'chip' | 'row' }>(), {
  layout: 'stacked',
  prompt: 'chip',
})
defineEmits<{ select: [branch: Branch] }>()

const PAGE = 5
const { $posthog } = useNuxtApp()
const passport = usePassportStore()

const query = ref('')
const showVisited = ref(false)
const showUnvisited = ref(false)
const nearMe = ref(false)
const limit = ref(PAGE)

const access = ref<LocationAccess>('unknown')
const position = ref<Coords | null>(null)
const locating = ref(false)
const located = computed(() => position.value !== null)

const hasCheckIns = computed(() => passport.checkIns.length > 0)
const showNearChip = computed(() => access.value !== 'denied' && access.value !== 'unavailable')

onMounted(async () => {
  access.value = await locationAccess()
  const cached = cachedPosition()
  if (cached) position.value = cached
})

async function toggleNearMe() {
  if (nearMe.value) {
    nearMe.value = false
    return
  }
  if (!position.value) {
    locating.value = true
    try {
      position.value = await getPosition({ timeout: 20000 })
      access.value = 'granted'
    } catch (err) {
      if ((err as GeolocationPositionError | undefined)?.code === 1) access.value = 'denied'
      return
    } finally {
      locating.value = false
    }
  }
  nearMe.value = true
  limit.value = PAGE
}

watch([nearMe, showVisited, showUnvisited], ([near, visited, unvisited]) => {
  $posthog?.capture('explore_filter_changed', { near_me: near, visited, not_visited: unvisited })
})

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(query, (val) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => $posthog?.capture('explore_searched', { query_length: val.length }), 600)
})

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  // Both visit chips on is the same as both off: every branch.
  const onlyVisited = showVisited.value && !showUnvisited.value
  const onlyUnvisited = showUnvisited.value && !showVisited.value
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
.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.controls-stacked {
  flex-direction: column;
}

.controls-inline {
  align-items: center;

  & .search-wrap {
    flex: 1;
    min-width: 0;
  }

  & .chips {
    margin: 0;
    padding: 0;
  }
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
  padding: 10px 12px 10px 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--tpl-blue);
  }
}

.chips {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 6px;
  margin: 0 -18px;
  padding: 2px 18px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;

  &.chip-on {
    background: var(--tpl-navy);
    border-color: var(--tpl-navy);
    color: #fff;
  }
}

.chip-icon {
  width: 14px;
  height: 14px;
  color: var(--tpl-blue);
}

.chip-spinner {
  width: 12px;
  height: 12px;
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

.near-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 12px;
  padding: 12px 14px;
  background: none;
  border: 1px dashed color-mix(in srgb, var(--tpl-blue) 40%, transparent);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--tpl-blue);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.near-row-chevron {
  width: 16px;
  height: 16px;
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
