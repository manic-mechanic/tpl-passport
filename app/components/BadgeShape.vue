<template>
  <div class="badge-shape" :class="[badge.shape, colorClass]"
    :style="{ ...inlineStyle, width: size + 'px', height: size + 'px' }">
    <template v-if="badge.id === 'navigator'">
      <svg class="compass-rose" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="none" :stroke="isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'"
          stroke-width="4" />
        <polygon points="32,5 28.5,13 35.5,13" :fill="compassLabelColor('n', true)" />
        <line x1="60" y1="32" x2="51" y2="32" stroke-width="1.5" :stroke="compassLineColor('e')" />
        <line x1="32" y1="60" x2="32" y2="51" stroke-width="1.5" :stroke="compassLineColor('s')" />
        <line x1="4" y1="32" x2="13" y2="32" stroke-width="1.5" :stroke="compassLineColor('w')" />
        <text x="32" y="22" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="800"
          :fill="compassLabelColor('n', true)">N</text>
        <text x="45" y="33" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700"
          :fill="compassLabelColor('e')">E</text>
        <text x="32" y="45" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700"
          :fill="compassLabelColor('s')">S</text>
        <text x="19" y="33" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700"
          :fill="compassLabelColor('w')">W</text>
        <circle cx="32" cy="32" r="2.5" :fill="isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.22)'" />
      </svg>
    </template>
    <template v-else-if="badge.id === 'page_turner'" />
    <span v-else class="badge-content" :style="{ fontSize: contentFontSize }">
      {{ badge.stat ? badge.stat(ctx) : badge.label }}
    </span>
  </div>
</template>

<script setup>
import { branchesByAlphaPage } from '~/composables/useRegion'
import { compassPoints } from '~/composables/useBadges'
import { useIsDark } from '~/composables/useIsDark'

const isDark = useIsDark()

const props = defineProps({
  badge: { type: Object, required: true },
  ctx: { type: Object, required: true },
  size: { type: Number, default: 64 },
})

const PAGE_TURNER_COLORS = ['#e07832', '#52cc84', '#1898c0', '#d44545', '#8f5fe0']

const contentFontSize = computed(() => {
  if (props.size >= 80) return '1.25rem'
  if (props.size <= 48) return '0.75rem'
  return '1rem'
})

// navigator and page_turner use inline gradient styles; all others use a color class or locked.
const colorClass = computed(() => {
  if (props.badge.id === 'navigator' || props.badge.id === 'page_turner') return null
  return props.badge.earned(props.ctx) ? props.badge.id.replace(/_/g, '-') : 'locked'
})

const inlineStyle = computed(() => {
  if (props.badge.id === 'navigator') return { background: compassGradient() }
  if (props.badge.id === 'page_turner') return { background: pageTurnerGradient() }
  return {}
})

function compassGradient() {
  const v = props.ctx.visitedBranchCodes
  const hit = '#f8f5f0', miss = 'var(--color-border)'
  const [n, e, s, w] = [compassPoints.n, compassPoints.e, compassPoints.s, compassPoints.w].map(c => v.has(c) ? hit : miss)
  return `conic-gradient(from -45deg, ${n} 0deg 90deg, ${e} 90deg 180deg, ${s} 180deg 270deg, ${w} 270deg 360deg)`
}

function pageTurnerGradient() {
  const locked = 'var(--color-border)'
  const segs = branchesByAlphaPage.map((page, i) => {
    const color = page.branches.some(b => props.ctx.visitedBranchCodes.has(b.BranchCode))
      ? PAGE_TURNER_COLORS[i] : locked
    return `${color} ${i * 72}deg, ${color} ${(i + 1) * 72}deg`
  })
  return `conic-gradient(from -36deg, ${segs.join(', ')})`
}

function compassLabelColor(dir, isNorth = false) {
  const visited = props.ctx.visitedBranchCodes.has(compassPoints[dir])
  if (!visited) return isDark.value ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)'
  // Visited quadrants always use cream bg (#f8f5f0), so always use dark text
  if (isNorth) return '#c0201a'
  return '#1a1510'
}

function compassLineColor(dir) {
  const visited = props.ctx.visitedBranchCodes.has(compassPoints[dir])
  if (!visited) return isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  // Visited quadrants always use cream bg — always use dark stroke
  return 'rgba(0,0,0,0.3)'
}
</script>

<style scoped>
.badge-shape {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &.octagon {
    clip-path: polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%);
  }

  &.circle {
    border-radius: 50%;
    overflow: hidden;
  }

  &.star {
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  }

  &.star .badge-content {
    margin-top: 3px;
  }

  &.locked {
    background: var(--badge-locked-bg);
  }

  &.locked .badge-content {
    color: var(--color-text-muted);
  }

  /* Stamp (octagon) — progression blues */
  &.first {
    background: radial-gradient(circle, #7ab4ec 0%, #3878c4 100%);
  }

  &.explorer {
    background: radial-gradient(circle, #4a90d9 0%, #0048a8 100%);
  }

  &.adventurer {
    background: radial-gradient(circle, #2e74c8 0%, #0030a0 100%);
  }

  &.globetrotter {
    background: var(--badge-globetrotter-bg);
  }

  &.complete {
    background: var(--badge-complete-bg);
  }

  /* Geography */
  &.page-filler {
    background: radial-gradient(circle, #52cc84 0%, #1a6640 100%);
  }

  /* Habit */
  &.day-tripper,
  &.archivist,
  &.quest-master,
  &.familiar-face,
  &.return-visitor {
    background: radial-gradient(circle, #eaa040 0%, #9e3c14 100%);
  }
}

.badge-content {
  font-family: var(--font-display);
  font-weight: 700;
  color: #fff;
  font-optical-sizing: auto;
  line-height: 1;
  position: relative;
  z-index: 1;
}

.compass-rose {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
</style>
