<template>
  <!-- Mode sub-tabs -->
  <nav class="mode-bar" role="tablist">
    <button v-for="mode in MODES" :key="mode.id" class="mode-tab" :class="{ active: activeMode === mode.id }"
            role="tab" :aria-selected="activeMode === mode.id" @click="activeMode = mode.id"
    >
      <IconMode class="mode-icon" v-html="mode.icon" />
      {{ mode.label }}
    </button>
  </nav>

  <!-- Walking routes -->
  <div v-if="activeMode === 'walk'" class="routes-list">
    <NuxtLink v-for="tripRoute in routesWithProgress" :key="tripRoute.id" :to="'/day-trips/' + tripRoute.id" class="route-card" @click="$posthog?.capture('day_trip_tapped', { route_id: tripRoute.id, route_name: tripRoute.name, visited: tripRoute.visited, total: tripRoute.total })">
      <div class="route-meta-row">
        <span class="area-chip">{{ tripRoute.area }}</span>
        <span class="route-info">🚶 {{ tripRoute.duration }} · {{ tripRoute.total }} stops</span>
        <IconChevron class="route-chevron" />
      </div>
      <p class="route-name">{{ tripRoute.name }}</p>
      <p class="route-desc">{{ tripRoute.description }}</p>
      <div class="route-stamps">
        <div v-for="b in tripRoute.branchObjects.slice(0, 4)" :key="b.BranchCode" class="route-stamp-item">
          <div :class="{ 'route-stamp-ghost': !passport.hasVisited(b.BranchCode) }">
            <StampShape :branch-code="b.BranchCode" :ward-no="b.WardNo" :size="40" />
          </div>
          <span class="route-stamp-label">{{ b.BranchName.replace(/ Branch$/, '') }}</span>
        </div>
        <div v-if="tripRoute.branchObjects.length > 4" class="route-overflow">
          +{{ tripRoute.branchObjects.length - 4 }}<br>More
        </div>
      </div>
    </NuxtLink>
  </div>

  <!-- Stubbed modes -->
  <p v-else class="coming-soon">
    {{ MODES.find(m => m.id === activeMode)?.label }} routes coming soon.
  </p>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, buildMapsUrl } from '~/composables/useRegion'
import routesData from '#data/routes.json'
import IconMode from '~/components/icons/IconMode.vue'
import IconChevron from '~/components/icons/IconChevron.vue'

// Day Trips tab: suggested multi-branch routes, filtered by transport mode.
const { $posthog } = useNuxtApp()
const passport = usePassportStore()

type TransportMode = 'walk' | 'bike' | 'transit' | 'drive'

const activeMode = ref<TransportMode>('walk')

watch(activeMode, (mode) => {
  $posthog?.capture('transport_mode_changed', { mode })
})

const MODES: { id: TransportMode, label: string, icon: string }[] = [
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

// ── Suggested Routes ─────────────────────────────────────────────────
const branchesByCode: Record<string, Branch | undefined> = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b]))

const routesWithProgress = computed(() =>
  routesData
    .filter(r => r.mode === activeMode.value)
    .map(r => {
      const branchObjects = r.branches.map(code => branchesByCode[code]).filter((b): b is Branch => !!b)
      const visited = branchObjects.filter(b => passport.hasVisited(b.BranchCode)).length
      return { ...r, branchObjects, visited, total: branchObjects.length, mapsUrl: buildMapsUrl(branchObjects) }
    })
)

</script>

<style scoped>
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
    color: var(--color-brand-text);
    border-bottom-color: var(--color-brand-text);

  }
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
  color: var(--color-brand-text);
  background: color-mix(in srgb, var(--color-brand-text) 8%, transparent);
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
