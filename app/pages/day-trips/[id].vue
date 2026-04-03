<template>
  <main class="page-content">

    <header class="route-header">
      <NuxtLink to="/explore?tab=routes" class="back-link">
        <IconBack />
        Day Trips
      </NuxtLink>
      <h1 class="route-title">{{ trip.name }}</h1>
      <p class="route-chips">{{ trip.area }} · {{ branchObjects.length }} stops · {{ trip.duration }}</p>
    </header>

    <p class="route-description">{{ trip.description }}</p>

    <a :href="mapsUrl" target="_blank" rel="noopener" class="maps-btn">
      <IconMapPin />
      Open full route in Maps
    </a>

    <section class="stops-section">
      <h2 class="stops-title">Stops</h2>
      <div class="stops-list">
        <BranchCard v-for="(b, i) in branchObjects" :key="b.BranchCode" :branch="b" :index="i + 1" as-button
          @select="openSheet" />
      </div>
    </section>

    <section class="suggestions-section">
      <h2 class="stops-title">Local Suggestions</h2>
      <p class="suggestions-empty">
        Curated tips from locals and librarians — coming soon.
      </p>
    </section>

  </main>

  <!-- Branch detail sheet -->
  <BaseSheet v-model:open="sheetOpen" :height="sheetHeight">
    <BranchDetail v-if="activeBranch" :branch="activeBranch" />
  </BaseSheet>
</template>

<script setup>
import { physicalBranches, buildMapsUrl } from '~/composables/useRegion'
import routesData from '#data/routes.json'
import IconBack from '~/components/icons/IconBack.vue'
import IconMapPin from '~/components/icons/IconMapPin.vue'

const nuxtRoute = useRoute()

const trip = routesData.find(r => r.id === nuxtRoute.params.id)

if (!trip) {
  throw createError({ statusCode: 404, statusMessage: 'Route not found' })
}

const branchesByCode = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b]))
const branchObjects = trip.branches.map(code => branchesByCode[code]).filter(Boolean)

const mapsUrl = buildMapsUrl(branchObjects)

const sheetOpen = ref(false)
const activeBranch = ref(null)
const sheetHeight = 'calc(100dvh - var(--nav-height) - 60px)'

function openSheet(branch) {
  activeBranch.value = branch
  sheetOpen.value = true
}
</script>

<style scoped>
.page-content {
  padding-bottom: calc(var(--nav-height) + 24px);
}

.route-header {
  padding: 16px 0 12px;
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

.route-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.route-chips {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.route-description {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 16px;
}

.maps-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  background: var(--tpl-blue);
  color: #fff;
  border-radius: var(--radius-pill);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 28px;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s;
}

.maps-btn:active {
  opacity: 0.85;
}

.maps-btn svg {
  width: 16px;
  height: 16px;
  stroke: #fff;
}

.stops-section {
  margin-bottom: 28px;
}

.suggestions-section {
  margin-bottom: 16px;
}

.stops-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--color-text);
}

.stops-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestions-empty {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
