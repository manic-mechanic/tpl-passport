<template>
  <div ref="box" class="branch-map" aria-hidden="true">
    <svg v-if="view" :viewBox="view.box" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect class="map-land" :x="view.x" :y="view.y" :width="view.w" :height="view.h" />
      <path v-if="lake" class="map-lake" :d="LAKE_PATH" />
      <circle v-for="d in dots" :key="d.code" :cx="d.x" :cy="d.y" :r="d.r" :fill="d.fill"
              :stroke="d.ring" :stroke-width="d.ring ? view.unit * 3 : 0" :stroke-opacity="0.3"
      />
      <circle v-if="hereDot" class="map-here" :cx="hereDot.x" :cy="hereDot.y" :r="dot * 2.6 * view.unit" :stroke-width="view.unit * 2" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { getStampColor } from '~/composables/useStamp'
import { physicalBranches } from '~/composables/useRegion'

// All 100 branches plotted from their latitude and longitude, on a plain
// city with the lake below. Decorative: the branch it is about is always
// named in text next to it.

const props = withDefaults(defineProps<{
  // Branches drawn in their stamp colour: codes, or 'all'. Others are grey.
  lit?: string[] | 'all'
  // Ringed as "you're here" / the selected branch.
  here?: string
  // Branch to centre on; the whole city when empty.
  focus?: string
  // 1 fits the whole city in the box, 2 is twice as close, and so on.
  zoom?: number
  // Dot radius in CSS px, for an unlit branch.
  dot?: number
  lake?: boolean
}>(), {
  lit: () => [],
  here: '',
  focus: '',
  zoom: 1,
  dot: 3,
  lake: true,
})

const RAD = Math.PI / 180
const lats = physicalBranches.map(b => Number(b.Lat))
const lngs = physicalBranches.map(b => Number(b.Long))
const minLng = Math.min(...lngs)
const maxLat = Math.max(...lats)
const midLat = (Math.min(...lats) + maxLat) / 2
const kx = Math.cos(midLat * RAD)
// Map units: 1000 across the city, north up.
const SPAN = (Math.max(...lngs) - minLng) * kx
const project = (lat: number, lng: number) => ({
  x: ((lng - minLng) * kx / SPAN) * 1000,
  y: ((maxLat - lat) / SPAN) * 1000,
})
const CITY = { w: 1000, h: ((maxLat - Math.min(...lats)) / SPAN) * 1000 }

const points = physicalBranches.map(b => ({ code: b.BranchCode, ward: b.WardNo, ...project(Number(b.Lat), Number(b.Long)) }))

// Lake Ontario, roughly: the shoreline from Etobicoke to the Scarborough Bluffs.
const SHORE: [number, number][] = [
  [43.4, -79.75], [43.575, -79.75], [43.585, -79.54], [43.615, -79.47], [43.632, -79.40],
  [43.638, -79.36], [43.662, -79.30], [43.70, -79.22], [43.76, -79.15], [43.80, -79.10],
  [43.82, -78.95], [43.4, -78.95],
]
const LAKE_PATH = SHORE.map(([lat, lng], i) => {
  const p = project(lat, lng)
  return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
}).join(' ') + ' Z'

const box = ref<HTMLElement | null>(null)
const size = ref({ w: 0, h: 0 })
let observer: ResizeObserver | null = null

onMounted(() => {
  const el = box.value
  if (!el) return
  const measure = () => { size.value = { w: el.clientWidth, h: el.clientHeight } }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(el)
  }
})
onUnmounted(() => observer?.disconnect())

// The visible part of the map, in map units, matching the box's shape.
const view = computed(() => {
  const { w, h } = size.value
  if (!w || !h) return null
  const margin = 1.08
  // px per map unit: the city covers the box at zoom 1
  const scale = Math.max(w / (CITY.w * margin), h / (CITY.h * margin)) * props.zoom
  const focus = points.find(p => p.code === props.focus)
  const cx = focus?.x ?? CITY.w / 2
  const cy = focus?.y ?? CITY.h / 2
  const vw = w / scale
  const vh = h / scale
  const x = cx - vw / 2
  const y = cy - vh / 2
  return { x, y, w: vw, h: vh, unit: 1 / scale, box: `${x} ${y} ${vw} ${vh}` }
})

const dots = computed(() => {
  const v = view.value
  if (!v) return []
  const all = props.lit === 'all'
  const lit = new Set(all ? [] : props.lit)
  const r = props.dot * v.unit
  return points.map((p) => {
    const on = all || lit.has(p.code)
    const { color } = getStampColor(p.ward)
    return {
      code: p.code, x: p.x, y: p.y,
      r: on ? r * 1.6 : r,
      fill: on ? color : 'var(--color-map-dot)',
      ring: on ? color : '',
    }
  })
})

const hereDot = computed(() => points.find(p => p.code === props.here) ?? null)
</script>

<style scoped>
.branch-map {
  position: relative;
  overflow: hidden;
  background: var(--color-map-land);

  & svg {
    display: block;
  }
}

.map-land {
  fill: var(--color-map-land);
}

.map-lake {
  fill: var(--color-map-lake);
}

.map-here {
  fill: color-mix(in srgb, var(--tpl-blue) 14%, transparent);
  stroke: var(--tpl-blue);
}
</style>
