<template>
  <section v-if="highlightBadges.length" class="badges-strip">
    <div class="section-header">
      <h2>Extra Credit</h2>
      <NuxtLink to="/passport#extra-credit" class="see-all">See all</NuxtLink>
    </div>

    <div class="badge-row">
      <NuxtLink
        v-for="badge in highlightBadges"
        :key="badge.id"
        to="/passport#extra-credit"
        class="badge-tile"
        :title="badge.desc"
      >
        <BadgeShape :badge="badge" :ctx="ctx" :size="40" :content-override="badgeShapeContent(badge)" />
        <span class="badge-name">{{ badge.title }}</span>
        <div v-if="badge.progress && !badge.earned(ctx)" class="badge-prog">
          <div class="prog-bar">
            <div class="prog-fill" :style="{ width: progPct(badge) + '%' }" />
          </div>
          <span class="prog-text">{{ progText(badge) }}</span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup>
import { BADGES, useBadgeCtx } from '~/composables/useBadges'

const ctx = useBadgeCtx()

// Always fill a full row of 6.
// Stamp badges (octagon): show only the most recently earned + the next one up.
// All other badges: recently earned → in-progress by % → upcoming.
const highlightBadges = computed(() => {
  const c = ctx.value

  const stamps    = BADGES.filter(a => a.shape === 'octagon')
  const nonStamps = BADGES.filter(a => a.shape !== 'octagon')

  const earnedStamps = stamps.filter(a => a.earned(c))
  const nextStamp    = stamps.find(a => !a.earned(c))
  const stampSlots   = [
    ...(earnedStamps.length ? [earnedStamps[earnedStamps.length - 1]] : []),
    ...(nextStamp ? [nextStamp] : []),
  ]

  const earnedNonStamps = nonStamps.filter(a => a.earned(c))
  const unearned        = nonStamps.filter(a => !a.earned(c))
  const inProgress      = unearned
    .filter(a => a.progress && a.progress(c).current > 0)
    .sort((a, b) => (b.progress(c).current / b.progress(c).total) - (a.progress(c).current / a.progress(c).total))
  const inProgressIds   = new Set(inProgress.map(a => a.id))
  const upcoming        = unearned.filter(a => !inProgressIds.has(a.id))

  const recentEarned = earnedNonStamps.slice(-2).reverse()
  const olderEarned  = earnedNonStamps.slice(0, -2).reverse()

  return [
    ...stampSlots,
    ...recentEarned,
    ...inProgress,
    ...upcoming,
    ...olderEarned,
  ].slice(0, 6)
})

function progPct(badge) {
  const { current, total } = badge.progress(ctx.value)
  return Math.min(100, Math.round((current / total) * 100))
}

function progText(badge) {
  const { current, total } = badge.progress(ctx.value)
  return `${current}/${total}`
}

function isActivityBadge(badge) {
  return ['day_tripper', 'return_visitor', 'familiar_face', 'archivist'].includes(badge.id)
}

function badgeShapeContent(badge) {
  if (!isActivityBadge(badge)) return ''
  const c = ctx.value
  if (badge.id === 'day_tripper') return String(c.maxBranchesInOneDay)
  if (badge.id === 'familiar_face') return String(c.homeVisitCount)
  if (badge.id === 'return_visitor') return String(c.maxNonHomeVisitCount)
  if (badge.id === 'archivist') return String(c.fullyDocumentedCount)
  return ''
}
</script>

<style scoped>
.badges-strip {
  margin-bottom: 0;
}

.badge-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.badge-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 2px;
  text-decoration: none;
  min-width: 0;
}

.badge-name {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.3;
  width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.badge-prog {
  display: flex;
  align-items: center;
  gap: 4px;

  & .prog-bar {
    width: 28px;
    height: 3px;
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
</style>
