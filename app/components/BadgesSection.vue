<template>
  <div class="badges-grid">
    <button v-for="badge in displayBadges" :key="badge.id" class="badge-item" @click="openSheet(badge)">
      <BadgeShape :badge="badge" :ctx="badgeCtx" :size="64" />
      <span class="badge-name" :class="{ earned: badge.earned(badgeCtx) }">{{ badge.title }}</span>
      <div v-if="showBadgeProgress(badge)" class="badge-progress">
        <div class="prog-bar">
          <div class="prog-fill" :style="{ width: badgeProgressPct(badge) + '%' }" />
        </div>
        <span class="prog-text">{{ badgeProgressLabel(badge) }}</span>
      </div>
    </button>
  </div>

  <!-- Badge detail sheet -->
  <BaseSheet v-model:open="sheetOpen" :height="props.sheetHeight" :aria-label="activeBadge?.title + ' badge detail'">
    <div v-if="activeBadge" class="detail-scroll">
      <div class="detail-badge">
        <BadgeShape :badge="activeBadge" :ctx="badgeCtx" :size="88" />
      </div>

      <h2 class="detail-title">{{ activeBadge.title }}</h2>
      <p class="detail-desc">{{ activeBadge.desc }}</p>

      <div v-if="activeBadge.earned(badgeCtx)" class="detail-status earned">
        <IconCheckMark />
        Earned{{ earnedDate(activeBadge) ? ' · ' + earnedDate(activeBadge) : '' }}
      </div>
      <div v-else-if="activeBadge.progress" class="detail-progress">
        <div class="prog-bar wide">
          <div class="prog-fill" :style="{ width: badgeProgressPct(activeBadge) + '%' }" />
        </div>
        <span class="prog-label">{{ badgeProgressLabel(activeBadge) }}</span>
      </div>

      <!-- Navigator: compass branches -->
      <div v-if="activeBadge.id === 'navigator'" class="detail-list">
        <div v-for="[dir, label] in [['n', 'North'], ['e', 'East'], ['s', 'South'], ['w', 'West']]" :key="dir"
          class="detail-row" :class="{ done: badgeCtx.visitedBranchCodes.has(compassPoints[dir]) }">
          <span class="detail-check">{{ badgeCtx.visitedBranchCodes.has(compassPoints[dir]) ? '✓' : '·' }}</span>
          <span class="detail-text"><span class="detail-dir">{{ label }}</span> — {{ branchName(compassPoints[dir])
            }}</span>
        </div>
      </div>

      <!-- Page Turner: one branch per page -->
      <div v-if="activeBadge.id === 'page_turner'" class="detail-list">
        <div v-for="page in branchesByAlphaPage" :key="page.label" class="detail-row"
          :class="{ done: page.branches.some(b => badgeCtx.visitedBranchCodes.has(b.BranchCode)) }">
          <span class="detail-check">{{page.branches.some(b => badgeCtx.visitedBranchCodes.has(b.BranchCode)) ? '✓' :
            '·' }}</span>
          <span class="detail-text">{{ page.label }}</span>
        </div>
      </div>

      <!-- Page Filler: fill one complete page -->
      <div v-if="activeBadge.id === 'page_filler'" class="detail-list">
        <div v-for="page in branchesByAlphaPage" :key="page.label" class="detail-row"
          :class="{ done: page.branches.every(b => badgeCtx.visitedBranchCodes.has(b.BranchCode)) }">
          <span class="detail-check">{{page.branches.every(b => badgeCtx.visitedBranchCodes.has(b.BranchCode)) ? '✓' :
            '·' }}</span>
          <span class="detail-text">{{ page.label }}</span>
          <span class="detail-count">{{page.branches.filter(b => badgeCtx.visitedBranchCodes.has(b.BranchCode)).length
            }}/{{ page.branches.length }}</span>
        </div>
      </div>

      <!-- Familiar Face: home branch -->
      <div v-if="activeBadge.id === 'familiar_face' && badgeCtx.homeBranch" class="detail-list">
        <div class="detail-row" :class="{ done: activeBadge.earned(badgeCtx) }">
          <span class="detail-check">{{ activeBadge.earned(badgeCtx) ? '✓' : '·' }}</span>
          <span class="detail-text">{{ branchName(badgeCtx.homeBranch) }}</span>
          <span class="detail-count">{{ badgeCtx.homeVisitCount }}/5 visits</span>
        </div>
      </div>
    </div>
  </BaseSheet>
</template>

<script setup>
import { physicalBranches, branchesByAlphaPage } from '~/composables/useRegion'
import { BADGES, useBadgeCtx, compassPoints } from '~/composables/useBadges'
import IconCheckMark from './icons/IconCheckMark.vue'

const props = defineProps({ sheetHeight: { type: String, default: 'calc(100dvh - var(--nav-height) - 76px)' } })

const { $posthog } = useNuxtApp()
const badgeCtx = useBadgeCtx()

const activeBadge = ref(null)
const sheetOpen = ref(false)

function openSheet(badge) {
  activeBadge.value = badge
  sheetOpen.value = true
  $posthog?.capture('badge_detail_viewed', {
    achievement_id: badge.id,
    achievement_title: badge.title,
    earned: badge.earned(badgeCtx.value),
  })
}
watch(sheetOpen, open => { if (!open) activeBadge.value = null })

// Column-major display order (2 cols, left col first):
const DISPLAY_ORDER = [
  'first', 'day_tripper',
  'archivist', 'navigator',
  'explorer', 'familiar_face',
  'adventurer', 'page_filler',
  'globetrotter', 'page_turner',
  'complete', 'return_visitor',
]
const displayBadges = DISPLAY_ORDER.map(id => BADGES.find(a => a.id === id)).filter(Boolean)

const nextStampId = computed(() =>
  BADGES.find(a => a.shape === 'octagon' && !a.earned(badgeCtx.value))?.id ?? null
)

function showBadgeProgress(badge) {
  const ctx = badgeCtx.value
  if (badge.earned(ctx) || !badge.progress) return false
  if (badge.progress(ctx).current === 0) return false
  if (badge.shape === 'octagon') return badge.id === nextStampId.value
  return true
}
function badgeProgressPct(badge) {
  const { current, total } = badge.progress(badgeCtx.value)
  return Math.min(100, Math.round((current / total) * 100))
}
function badgeProgressLabel(badge) {
  const { current, total } = badge.progress(badgeCtx.value)
  return `${current}/${total}`
}

function earnedDate(badge) {
  if (!badge.earnedAt || !badge.earned(badgeCtx.value)) return null
  return badge.earnedAt(badgeCtx.value)
}

function branchName(code) {
  return physicalBranches.find(b => b.BranchCode === code)?.BranchName ?? code
}
</script>

<style scoped>
/* Grid: 2 cols, center dashed divider, dashed row borders */
.badges-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    background-image: var(--dashed-divider-v);
    background-size: 2px 8px;
    pointer-events: none;
  }
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 12px;
  min-height: 140px;
  border-bottom: 2px dashed var(--color-border);
  /* Reset button styles */
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  width: 100%;

  /* Remove bottom border from the last two items (final row) */
  &:nth-last-child(-n+2) {
    border-bottom: none;
  }
}

.badge-name {
  font-size: 0.625rem;
  font-weight: 600;
  text-align: center;
  color: var(--color-text-muted);
  letter-spacing: 0.01em;
  line-height: 1.3;

  &.earned {
    color: var(--color-text);
  }
}

.badge-progress {
  display: flex;
  align-items: center;
  gap: 4px;

  & .prog-bar {
    width: 28px;
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
  }

  & .prog-fill {
    height: 100%;
    background: var(--color-text-muted);
    border-radius: 2px;
    min-width: 2px;
  }

  & .prog-text {
    font-size: 0.5rem;
    font-weight: 600;
    color: var(--color-text-muted);
    line-height: 1;
  }
}

/* Sheet content */
.detail-scroll {
  padding-top: 4px;
}

.detail-badge {
  display: flex;
  justify-content: center;
  padding: 12px 0 16px;
}

.detail-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  text-align: center;
  color: var(--color-brand-text);
  margin-bottom: 8px;
  line-height: 1.25;
}

.detail-desc {
  font-size: 0.875rem;
  color: var(--color-text-mid);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 20px;
}

.detail-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 20px;

  &.earned {
    color: var(--color-success);

    & svg {
      width: 14px;
      height: 14px;
      stroke: var(--color-success);
      flex-shrink: 0;
    }
  }
}

.detail-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.prog-bar {
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;

  &.wide {
    width: 120px;
  }
}

.prog-fill {
  height: 100%;
  background: var(--tpl-blue);
  border-radius: 2px;
  min-width: 2px;
}

.prog-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

/* Detail rows (Navigator, Page Turner, Page Filler, Familiar Face) */
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  color: var(--color-text-muted);

  &.done {
    color: var(--color-text);
  }

  @media (prefers-color-scheme: dark) {
    & {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}

:global([data-theme="dark"]) .detail-row {
  background: rgba(255, 255, 255, 0.05);
}

.detail-check {
  font-size: 0.875rem;
  font-weight: 700;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
  color: var(--tpl-blue);
}

.detail-row:not(.done) .detail-check {
  color: var(--color-border);
}

.detail-text {
  font-size: 0.875rem;
  flex: 1;
  line-height: 1.3;
}

.detail-dir {
  font-weight: 600;
}

.detail-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
</style>
