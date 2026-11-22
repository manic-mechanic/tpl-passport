<template>
  <a :href="href" target="_blank" rel="noopener" class="leg-link" aria-label="Directions (opens another site)"
     @click="$posthog?.capture('tour_directions_tapped', { route_id: routeId, leg })"
  >
    Directions<IconExternal class="external-icon" aria-hidden="true" />
  </a>
</template>

<script setup lang="ts">
import IconExternal from '~/components/icons/IconExternal.vue'

// The Google Maps transit link for one leg of a tour page.
defineProps<{ href: string, routeId: number, leg: number }>()
</script>

<style scoped>
.leg-link {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
