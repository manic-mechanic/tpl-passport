<template>
  <main class="page-content">
    <!-- Sticky header + tabs -->
    <PageBanner title="Explore">
      <!-- Tab pills -->
      <nav class="tab-bar" role="tablist">
        <NuxtLink v-for="tab in EXPLORE_TABS" :key="tab.path" :to="tab.path" class="tab-pill"
                  :class="{ active: activeTab === tab }" role="tab" :aria-selected="activeTab === tab"
        >
          {{ tab.label }}
        </NuxtLink>
      </nav>
    </PageBanner>

    <section class="explore-section">
      <NuxtPage :keepalive="true" />
    </section>
  </main>

  <!-- Branch detail sheet -->
  <BaseSheet v-model:open="branchSheetOpen" :height="branchSheetHeight">
    <BranchDetail v-if="activeBranch" :branch="activeBranch" source="explore" @open-branch="openBranchSheet" />
  </BaseSheet>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { cachedPosition, getPosition, locationAccess } from '~/lib/geolocation'
import { EXPLORE_TABS, exploreContextKey, exploreTabFor } from '~/lib/exploreRoutes'

const { $posthog } = useNuxtApp()

// ── Tab state ────────────────────────────────────────────────────────
// Each tab is a route under /explore (see ~/lib/exploreRoutes). The
// analytics names are the ones the tabs had before they were routes.
const route = useRoute()
const activeTab = computed(() => exploreTabFor(route.path))

watch(() => activeTab.value?.analytics, (tab) => {
  if (tab) $posthog?.capture('explore_tab_changed', { tab })
})

// ── Location for Events ───────────────────────────────────────────────
// Events sort by distance when we can get a position without a prompt: a
// recent one is cached, or this device has allowed location (see
// locationAccess). ExploreBranches handles Near Me itself.
const userLat = ref<number | null>(null)
const userLng = ref<number | null>(null)

onMounted(async () => {
  if (!cachedPosition() && await locationAccess() !== 'granted') return
  try {
    const pos = await getPosition({ timeout: 20000 })
    userLat.value = pos.latitude
    userLng.value = pos.longitude
  } catch {
    // no position: events keep their default order
  }
})

// ── Sheets ────────────────────────────────────────────────────────────
const branchSheetOpen = ref(false)
const activeBranch = ref<Branch | null>(null)
const branchSheetHeight = 'calc(100svh - var(--nav-height) - 60px)'

function openBranchSheet(branch: Branch) {
  activeBranch.value = branch
  branchSheetOpen.value = true
}

provide(exploreContextKey, { openBranch: openBranchSheet, userLat, userLng })
</script>

<style scoped>
.page-content {
  padding-bottom: var(--nav-height);
}

/* ── Sticky header block ─────────────────────────────────────────── */
/* ── Page header ─────────────────────────────────────────────────── */
.sub {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.55);
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
  flex: 1 1 auto;
  text-align: center;
  white-space: nowrap;
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
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.tab-pill {
  &.active {
    color: var(--color-brand-text);
    border-bottom-color: var(--color-brand-text);
  }
}
</style>
