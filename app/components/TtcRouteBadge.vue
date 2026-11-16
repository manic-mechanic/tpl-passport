<template>
  <span class="ttc-route" :aria-label="label">
    <TtcModeIcon :mode="mode" />
    <span
      class="ttc-route-number"
      :class="{ 'ttc-route-number--line': rapidTransit }"
      :style="{
        background: badge.background ?? 'transparent',
        color: badge.color,
        boxShadow: badge.border ? `inset 0 0 0 1.5px ${badge.border}` : undefined,
      }"
      aria-hidden="true"
    >{{ line }}</span>
    <span v-if="name" class="ttc-route-name" aria-hidden="true">{{ name }}</span>
  </span>
</template>

<script setup lang="ts">
import type { TourMode } from '~/lib/libraryTour'
import { isRapidTransitLine, routeBadgeStyle, routeShortName } from '~/lib/ttcRouteStyle'

// One TTC ride, e.g. [bus] (45) Kipling or [subway] (2) Bloor-Danforth.
const props = defineProps<{
  mode: TourMode
  line: string
  lineName?: string
}>()

const badge = computed(() => routeBadgeStyle(props.mode, props.line))
const rapidTransit = computed(() => props.mode === 'SUBWAY' || isRapidTransitLine(props.line))
const name = computed(() => routeShortName(props.lineName, props.line))
const label = computed(() => {
  const kind = rapidTransit.value ? 'Line' : props.mode === 'TRAM' ? 'Streetcar' : 'Bus'
  return `${kind} ${props.line}${name.value ? ` ${name.value}` : ''}`
})
</script>

<style scoped>
.ttc-route {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  color: var(--color-text);
}

.ttc-route-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6em;
  height: 1.45em;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* Rapid-transit lines get the round TTC line marker */
.ttc-route-number--line {
  width: 1.45em;
  min-width: 0;
  padding: 0;
  border-radius: 50%;
}

.ttc-route-name {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
