<template>
  <!-- Morning: a rising sun; afternoon: the sun; evening: a moon -->
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-bind="$attrs">
    <template v-if="time === 'morning'">
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M3 17h18M12 6v3M5.6 10.6l1.4 1.4M18.4 10.6 17 12M7 21h10" />
    </template>
    <template v-else-if="time === 'afternoon'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </template>
    <path v-else d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
</template>

<script setup lang="ts">
import type { TimeOfDay } from '~/lib/exploreEvents'

defineProps<{ time: TimeOfDay }>()
</script>
