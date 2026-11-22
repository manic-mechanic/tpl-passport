<template>
  <ExploreDayTrips :mode="mode" />
</template>

<script setup lang="ts">
import type { TripMode } from '~/lib/exploreRoutes'

// /explore/trips/transit and /explore/trips/walking. One page instance for
// both, so switching mode keeps the list's state.
definePageMeta({
  key: 'explore-trips',
  validate: route => route.params.mode === 'transit' || route.params.mode === 'walking',
})

const route = useRoute()
const mode = computed(() => route.params.mode as TripMode)
</script>
