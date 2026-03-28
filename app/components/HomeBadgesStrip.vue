<template>
  <section v-if="highlightBadges.length" class="badges-strip">
    <div class="section-header">
      <h2>Endorsements</h2>
      <NuxtLink to="/passport#endorsements" class="see-all">See all</NuxtLink>
    </div>

    <div class="badge-row">
      <NuxtLink
        v-for="badge in highlightBadges"
        :key="badge.id"
        to="/passport#endorsements"
        class="badge-tile"
        :title="badge.desc"
      >
        <div
          class="badge-shape"
          :class="[`badge-shape--${badge.shape}`, getBadgeColorClass(badge)]"
          :style="getBadgeInlineStyle(badge)"
        >
          <template v-if="badge.id === 'navigator'">
            <svg class="compass-rose" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="4"/>
              <polygon points="32,5 28.5,13 35.5,13" :fill="compassLabelColor('n', true)"/>
              <line x1="60" y1="32" x2="51" y2="32" stroke-width="1.5" stroke="rgba(0,0,0,0.2)"/>
              <line x1="32" y1="60" x2="32" y2="51" stroke-width="1.5" stroke="rgba(0,0,0,0.2)"/>
              <line x1="4"  y1="32" x2="13" y2="32" stroke-width="1.5" stroke="rgba(0,0,0,0.2)"/>
              <text x="32" y="22" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="800" :fill="compassLabelColor('n', true)">N</text>
              <text x="45" y="33" text-anchor="middle" dominant-baseline="middle" font-size="9"  font-weight="700" :fill="compassLabelColor('e')">E</text>
              <text x="32" y="45" text-anchor="middle" dominant-baseline="middle" font-size="9"  font-weight="700" :fill="compassLabelColor('s')">S</text>
              <text x="19" y="33" text-anchor="middle" dominant-baseline="middle" font-size="9"  font-weight="700" :fill="compassLabelColor('w')">W</text>
              <circle cx="32" cy="32" r="2.5" fill="rgba(0,0,0,0.22)"/>
            </svg>
          </template>
          <span v-else class="badge-content">{{ badge.stat ? badge.stat(ctx) : (badge.label ?? '') }}</span>
        </div>
        <span class="badge-name">{{ badge.title }}</span>
        <div v-if="badge.progress && !badge.earned(ctx)" class="badge-prog">
          <div class="badge-prog__bar">
            <div class="badge-prog__fill" :style="{ width: progPct(badge) + '%' }" />
          </div>
          <span class="badge-prog__text">{{ progText(badge) }}</span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { ACHIEVEMENTS, buildAchievementCtx, compassPoints } from '~/composables/useAchievements'

const passport = usePassportStore()

const ctx = computed(() => buildAchievementCtx({
  checkIns:            passport.checkIns,
  visitedBranchCodes:  passport.visitedBranchCodes,
  completedChallenges: passport.completedChallenges,
  homeBranch:          passport.profile.homeBranch,
}))

// Always fill a full row of 6.
// Stamp endorsements (octagon): show only the most recently earned + the next one up.
// All other endorsements: recently earned → in-progress by % → upcoming.
const highlightBadges = computed(() => {
  const c = ctx.value

  const stamps    = ACHIEVEMENTS.filter(a => a.shape === 'octagon')
  const nonStamps = ACHIEVEMENTS.filter(a => a.shape !== 'octagon')

  const earnedStamps  = stamps.filter(a => a.earned(c))
  const nextStamp = stamps.find(a => !a.earned(c))
  const stampSlots = [
    ...(earnedStamps.length ? [earnedStamps[earnedStamps.length - 1]] : []),  // most recently earned stamp
    ...(nextStamp ? [nextStamp] : []),                                         // next stamp up
  ]

  const earnedNonStamps  = nonStamps.filter(a => a.earned(c))
  const unearned         = nonStamps.filter(a => !a.earned(c))
  const inProgress       = unearned
    .filter(a => a.progress && a.progress(c).current > 0)
    .sort((a, b) => (b.progress(c).current / b.progress(c).total) - (a.progress(c).current / a.progress(c).total))
  const inProgressIds    = new Set(inProgress.map(a => a.id))
  const upcoming         = unearned.filter(a => !inProgressIds.has(a.id))

  const recentEarned = earnedNonStamps.slice(-2).reverse()
  const olderEarned  = earnedNonStamps.slice(0, -2).reverse()

  return [
    ...stampSlots,
    ...recentEarned,
    ...inProgress,
    ...upcoming,
    ...olderEarned,  // backfill if the above don't fill 6
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

function getBadgeColorClass(badge) {
  if (badge.id === 'navigator') return null
  return badge.earned(ctx.value) ? `badge-shape--${badge.id}` : 'badge-shape--locked'
}

function getBadgeInlineStyle(badge) {
  if (badge.id === 'navigator') return { background: navigatorGradient() }
  return {}
}

function navigatorGradient() {
  const v = ctx.value.visitedBranchCodes
  const hit = '#f8f5f0', miss = 'var(--color-border)'
  const [n, e, s, w] = [compassPoints.n, compassPoints.e, compassPoints.s, compassPoints.w].map(c => v.has(c) ? hit : miss)
  return `conic-gradient(from -45deg, ${n} 0deg 90deg, ${e} 90deg 180deg, ${s} 180deg 270deg, ${w} 270deg 360deg)`
}

function compassLabelColor(dir, isNorth = false) {
  return ctx.value.visitedBranchCodes.has(compassPoints[dir])
    ? (isNorth ? '#c0201a' : '#1a1510')
    : 'rgba(0,0,0,0.2)'
}
</script>

<style scoped>
.badges-strip {
  margin-bottom: 0;
}

.badge-row {
  display: flex;
  gap: 4px;
}

.badge-tile {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 2px;
  text-decoration: none;
  min-width: 0;
}

/* Badge shapes */
.badge-shape {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.badge-shape--octagon { clip-path: polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%); }
.badge-shape--circle  { border-radius: 50%; }
.badge-shape--star    { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
.badge-shape--star .badge-content { margin-top: 3px; }
.badge-shape--locked  { background: var(--color-border) !important; }

/* Stamp badges */
.badge-shape--first        { background: radial-gradient(circle, #7ab4ec 0%, #3878c4 100%); }
.badge-shape--explorer     { background: radial-gradient(circle, #4a90d9 0%, #0048a8 100%); }
.badge-shape--adventurer   { background: radial-gradient(circle, #1e60b4 0%, #001e78 100%); }
.badge-shape--globetrotter { background: radial-gradient(circle, #002880 0%, #000e50 100%); }
.badge-shape--complete     { background: radial-gradient(circle, #001c70 0%, #000640 100%); }
/* Geography */
.badge-shape--district_champ { background: radial-gradient(circle, #52cc84 0%, #1a6640 100%); }
/* World tour + navigator earned — simplified solid color on home strip */
.badge-shape--world_tour   { background: radial-gradient(circle, #e07832 0%, #9e3c14 100%); }
.badge-shape--navigator    { background: radial-gradient(circle, #b8986e 0%, #7a5830 100%); }
/* Habit */
.badge-shape--day_tripper,
.badge-shape--archivist,
.badge-shape--quest_master,
.badge-shape--familiar_face,
.badge-shape--return_visitor { background: radial-gradient(circle, #eaa040 0%, #9e3c14 100%); }

.badge-content {
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  font-optical-sizing: auto;
  line-height: 1;
}
.badge-shape--locked .badge-content { color: var(--color-text-muted); }

.compass-rose { position: absolute; inset: 0; width: 100%; height: 100%; }

.badge-name {
  font-size: 0.6rem;
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
}
.badge-prog__bar {
  width: 28px;
  height: 3px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}
.badge-prog__fill {
  height: 100%;
  background: var(--color-text-muted);
  border-radius: 2px;
  min-width: 2px;
}
.badge-prog__text {
  font-size: 0.5rem;
  font-weight: 600;
  color: var(--color-text-muted);
  line-height: 1;
}
</style>
