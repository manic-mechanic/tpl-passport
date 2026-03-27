<template>
  <section v-if="highlightBadges.length" class="badges-strip">
    <div class="section-header">
      <h2>Endorsements</h2>
      <NuxtLink to="/passport?tab=badges" class="see-all">See all</NuxtLink>
    </div>

    <div class="badge-row">
      <NuxtLink
        v-for="badge in highlightBadges"
        :key="badge.id"
        to="/passport?tab=badges"
        class="badge-tile"
        :title="badge.desc"
      >
        <div
          class="badge-shape"
          :class="[`badge-shape--${badge.shape}`, getBadgeColorClass(badge)]"
          :style="getBadgeInlineStyle(badge)"
        >
          <span class="badge-content">{{ badge.label ?? '' }}</span>
        </div>
        <span class="badge-name">{{ badge.title }}</span>
        <div v-if="badge.progress && !badge.earned(ctx)" class="badge-prog">
          <div class="badge-prog__bar">
            <div class="badge-prog__fill" :style="{ width: progPct(badge) + '%' }" />
          </div>
          <span class="badge-prog__text">{{ badge.progress(ctx).current }}/{{ badge.progress(ctx).total }}</span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { ACHIEVEMENTS, buildAchievementCtx } from '~/composables/useAchievements'

const passport = usePassportStore()

const ctx = computed(() => buildAchievementCtx({
  checkIns:            passport.checkIns,
  visitedBranchCodes:  passport.visitedBranchCodes,
  completedChallenges: passport.completedChallenges,
  homeBranch:          passport.profile.homeBranch,
}))

// Up to 2 recently earned (last in ACHIEVEMENTS order = most advanced)
// + up to 2 in-progress (highest % first). Total ≤ 4.
const highlightBadges = computed(() => {
  const c = ctx.value
  const earned = ACHIEVEMENTS.filter(a => a.earned(c))
  const inProgress = ACHIEVEMENTS
    .filter(a => !a.earned(c) && a.progress && a.progress(c).current > 0)
    .sort((a, b) => {
      const pa = a.progress(c), pb = b.progress(c)
      return (pb.current / pb.total) - (pa.current / pa.total)
    })

  const result = [
    ...earned.slice(-2).reverse(),   // last 2 earned, most recent first
    ...inProgress.slice(0, 2),
  ]

  // If nothing at all, show first 3 as preview targets
  if (!result.length) return ACHIEVEMENTS.slice(0, 3)
  return result
})

function progPct(badge) {
  const { current, total } = badge.progress(ctx.value)
  return Math.min(100, Math.round((current / total) * 100))
}

function getBadgeColorClass(badge) {
  return badge.earned(ctx.value) ? `badge-shape--${badge.id}` : 'badge-shape--locked'
}

function getBadgeInlineStyle(badge) {
  // world_tour and navigator use special rendering in AchievementsSection;
  // on the home strip, show them as plain earned/locked state.
  return {}
}
</script>

<style scoped>
.badges-strip {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h2 {
  font-size: 1.05rem;
}

.see-all {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--tpl-blue);
  text-decoration: none;
}

.badge-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.badge-row::-webkit-scrollbar { display: none; }

.badge-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  width: 72px;
  padding: 8px 4px;
  text-decoration: none;
}

/* Badge shapes */
.badge-shape {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge-shape--octagon { clip-path: polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%); }
.badge-shape--circle  { border-radius: 50%; }
.badge-shape--star    { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
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
  font-size: 0.82rem;
  font-weight: 700;
  color: #fff;
  font-optical-sizing: auto;
  line-height: 1;
}
.badge-shape--locked .badge-content { color: var(--color-text-muted); }

.badge-name {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 68px;
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
