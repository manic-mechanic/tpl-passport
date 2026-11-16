<template>
  <main class="page-content">
    <PageBanner :title="trip.name" back-label="Day Trips" back-to="/explore?tab=routes">
      <template #sub>{{ trip.area }} · {{ branchObjects.length }} stops · {{ trip.duration }}</template>
    </PageBanner>

    <p class="route-description">{{ trip.description }}</p>

    <a :href="mapsUrl" target="_blank" rel="noopener" class="maps-btn">
      <IconMapPin />
      Open full route in Maps
    </a>

    <section class="stops-section">
      <h2 class="stops-title">Stops</h2>
      <div class="stops-list">
        <BranchCard v-for="(b, i) in branchObjects" :key="b.BranchCode" :branch="b" :index="i + 1" as-button
                    @select="openSheet"
        />
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
    <BranchDetail v-if="activeBranch" :branch="activeBranch" @open-branch="openSheet" />
  </BaseSheet>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { branchesByCode, buildMapsUrl } from '~/composables/useRegion'
import routesData from '#data/routes.json'
import IconMapPin from '~/components/icons/IconMapPin.vue'

// Reject unknown trips before the page renders, so both server and client-side
// navigation show error.vue's 404. Throwing from setup instead lets the
// template render with no trip, which crashes in dev.
definePageMeta({
  validate: route => routesData.some(r => r.id === route.params.id),
})

const nuxtRoute = useRoute()

const trip = routesData.find(r => r.id === nuxtRoute.params.id)!

const branchObjects = trip.branches.map(code => branchesByCode[code]).filter((b): b is Branch => !!b)

const mapsUrl = buildMapsUrl(branchObjects)

const sheetOpen = ref(false)
const activeBranch = ref<Branch | null>(null)
const sheetHeight = 'calc(100svh - var(--nav-height) - 60px)'

function openSheet(branch: Branch) {
  activeBranch.value = branch
  sheetOpen.value = true
}
</script>

<style scoped>
.page-content {
  padding-bottom: calc(var(--nav-height) + 24px);
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
  color: var(--color-text-inverse);
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
