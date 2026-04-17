<template>
  <svg class="compass-rose" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="none" :stroke="isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'"
            stroke-width="4"
    />
    <polygon points="32,5 28.5,13 35.5,13" :fill="labelColor('n', true)" />
    <line x1="60" y1="32" x2="51" y2="32" stroke-width="1.5" :stroke="lineColor('e')" />
    <line x1="32" y1="60" x2="32" y2="51" stroke-width="1.5" :stroke="lineColor('s')" />
    <line x1="4" y1="32" x2="13" y2="32" stroke-width="1.5" :stroke="lineColor('w')" />
    <text x="32" y="22" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="800"
          :fill="labelColor('n', true)"
    >N</text>
    <text x="45" y="33" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700"
          :fill="labelColor('e')"
    >E</text>
    <text x="32" y="45" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700"
          :fill="labelColor('s')"
    >S</text>
    <text x="19" y="33" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700"
          :fill="labelColor('w')"
    >W</text>
    <circle cx="32" cy="32" r="2.5" :fill="isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.22)'" />
  </svg>
</template>

<script setup>
import { compassPoints } from '~/composables/useBadges'
import { useIsDark } from '~/composables/useIsDark'

const props = defineProps({
  ctx: { type: Object, required: true },
})

const isDark = useIsDark()

function labelColor(dir, isNorth = false) {
  const visited = props.ctx.visitedBranchCodes.has(compassPoints[dir])
  if (!visited) return isDark.value ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)'
  if (isNorth) return '#c0201a'
  return '#1a1510'
}

function lineColor(dir) {
  const visited = props.ctx.visitedBranchCodes.has(compassPoints[dir])
  if (!visited) return isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  return 'rgba(0,0,0,0.3)'
}
</script>

<style scoped>
.compass-rose {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
</style>
