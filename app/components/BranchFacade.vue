<template>
  <svg class="branch-facade" viewBox="0 0 200 160" :width="width" :height="Math.round(width * 0.8)" aria-hidden="true">
    <rect width="200" height="160" :fill="sky" />
    <circle cx="164" cy="30" r="14" fill="#f6d9a8" />
    <rect x="0" y="128" width="200" height="32" fill="#d9d2c3" />
    <path d="M0 136 H200" stroke="#c4bba8" stroke-width="1.5" stroke-dasharray="10 8" />
    <rect x="0" y="122" width="200" height="8" fill="#9cc58a" />
    <path :d="building.roof" :fill="dark" />
    <rect :x="building.x" :y="building.y" :width="building.w" :height="building.h" :fill="wall" />
    <rect :x="building.x" :y="building.y" :width="building.w" height="12" :fill="dark" opacity="0.18" />
    <rect v-for="(win, i) in building.wins" :key="i" :x="win[0]" :y="win[1]" :width="win[2]" :height="win[3]" :rx="win[4]"
          fill="#fdf3d8" :stroke="dark" stroke-width="2"
    />
    <rect x="88" y="92" width="24" height="36" rx="12" :fill="dark" />
    <rect x="84" y="126" width="32" height="4" fill="#bfb6a3" />
    <circle cx="22" cy="100" r="18" fill="#5f9e57" />
    <circle cx="36" cy="110" r="13" fill="#78b06a" />
    <rect x="21" y="110" width="3" height="16" fill="#6b4a2e" />
    <circle cx="180" cy="104" r="16" fill="#78b06a" />
    <rect x="179" y="112" width="3" height="14" fill="#6b4a2e" />
  </svg>
</template>

<script setup lang="ts">
import { stampHue } from '~/lib/stampHue'

// A storybook library building in the branch's stamp colour. The style
// (columns, glass box, rounded roof) is picked from the branch code, so a
// branch always looks the same. Not a likeness of the real building.

const props = withDefaults(defineProps<{
  branchCode: string
  wardNo: number | string
  width?: number
}>(), {
  width: 200,
})

const BUILDINGS = [
  // pediment and tall windows
  { x: 50, y: 58, w: 100, h: 70, roof: 'M44 60 L100 30 L156 60 Z', wins: [[58, 72, 18, 40, 9], [124, 72, 18, 40, 9]] },
  // glass box
  { x: 40, y: 46, w: 120, h: 82, roof: 'M36 42 H164 V48 H36 Z', wins: [[48, 56, 32, 26, 2], [84, 56, 32, 26, 2], [120, 56, 32, 26, 2], [48, 88, 32, 34, 2], [120, 88, 32, 34, 2]] },
  // rounded roof
  { x: 48, y: 62, w: 104, h: 66, roof: 'M44 66 C44 30 156 30 156 66 Z', wins: [[58, 74, 20, 30, 10], [122, 74, 20, 30, 10]] },
]

function codeHash(code: string) {
  let h = 0
  for (const c of code) h = (h * 7 + c.charCodeAt(0)) % 997
  return h
}

const hue = computed(() => stampHue(props.wardNo))
const building = computed(() => BUILDINGS[codeHash(props.branchCode) % BUILDINGS.length]!)
const sky = computed(() => `hsl(${(hue.value + 190) % 360}, 55%, 88%)`)
const wall = computed(() => `hsl(${hue.value}, 45%, 62%)`)
const dark = computed(() => `hsl(${hue.value}, 50%, 30%)`)
</script>

<style scoped>
.branch-facade {
  display: block;
}
</style>
