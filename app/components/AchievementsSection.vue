<template>
  <div class="endorsements-grid">
    <div v-for="badge in displayAchievements" :key="badge.id" class="endorsement-item" :title="badge.desc">
      <div
        class="badge-shape"
        :class="[`badge-shape--${badge.shape}`, getBadgeColorClass(badge)]"
        :style="getBadgeInlineStyle(badge)"
      >
        <template v-if="badge.id === 'navigator'">
          <svg class="compass-rose" viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <linearGradient id="compass-border-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#e0e0e0"/><stop offset="50%" stop-color="#888"/><stop offset="100%" stop-color="#ccc"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="30" fill="none" stroke="url(#compass-border-grad)" stroke-width="4"/>
            <line x1="14" y1="14" x2="50" y2="50" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
            <line x1="50" y1="14" x2="14" y2="50" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
            <polygon points="32,5 28.5,13 35.5,13" :fill="compassLabelColor('n', true)"/>
            <line x1="60" y1="32" x2="51" y2="32" stroke-width="1.5" :stroke="compassLineColor('e')"/>
            <line x1="32" y1="60" x2="32" y2="51" stroke-width="1.5" :stroke="compassLineColor('s')"/>
            <line x1="4"  y1="32" x2="13" y2="32" stroke-width="1.5" :stroke="compassLineColor('w')"/>
            <text x="32" y="22" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="800" :fill="compassLabelColor('n', true)">N</text>
            <text x="45" y="33" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700" :fill="compassLabelColor('e')">E</text>
            <text x="32" y="45" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700" :fill="compassLabelColor('s')">S</text>
            <text x="19" y="33" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700" :fill="compassLabelColor('w')">W</text>
            <circle cx="32" cy="32" r="2.5" fill="rgba(0,0,0,0.22)"/>
          </svg>
        </template>
        <span v-else class="badge-content">{{ badge.stat ? badge.stat(achievementCtx) : badge.label }}</span>
      </div>

      <span class="badge-name" :class="{ 'badge-name--earned': badge.earned(achievementCtx) }">{{ badge.title }}</span>

      <div v-if="showBadgeProgress(badge)" class="badge-progress">
        <div class="badge-progress__bar">
          <div class="badge-progress__fill" :style="{ width: badgeProgressPct(badge) + '%' }" />
        </div>
        <span class="badge-progress__text">{{ badgeProgressLabel(badge) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { DISTRICT_ORDER } from '~/composables/useRegion'
import { ACHIEVEMENTS, buildAchievementCtx, compassPoints, compassBranches } from '~/composables/useAchievements'

const passport = usePassportStore()

const achievementCtx = computed(() => buildAchievementCtx({
  checkIns:            passport.checkIns,
  visitedBranchCodes:  passport.visitedBranchCodes,
  completedChallenges: passport.completedChallenges,
  homeBranch:          passport.profile.homeBranch,
}))

// Column-major display order (2 cols, left col first):
// Left:  First Stamp, Archivist, Explorer, Adventurer, Globetrotter, Full Passport
// Right: Day Tripper, Navigator, Familiar Face, District Champ, World Tour, Return Visitor
const DISPLAY_ORDER = [
  'first',        'day_tripper',
  'archivist',    'navigator',
  'explorer',     'familiar_face',
  'adventurer',   'district_champ',
  'globetrotter', 'world_tour',
  'complete',     'return_visitor',
]
const displayAchievements = DISPLAY_ORDER.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean)

const nextStampId = computed(() =>
  ACHIEVEMENTS.find(a => a.shape === 'octagon' && !a.earned(achievementCtx.value))?.id ?? null
)

function showBadgeProgress(badge) {
  const ctx = achievementCtx.value
  if (badge.earned(ctx) || !badge.progress) return false
  if (badge.progress(ctx).current === 0) return false
  if (badge.shape === 'octagon') return badge.id === nextStampId.value
  return true
}
function badgeProgressPct(badge) {
  const { current, total } = badge.progress(achievementCtx.value)
  return Math.min(100, Math.round((current / total) * 100))
}
function badgeProgressLabel(badge) {
  const { current, total } = badge.progress(achievementCtx.value)
  return `${current}/${total}`
}

const WORLD_TOUR_COLORS = {
  'Etobicoke-York': '#e07832', 'North York': '#8f5fe0',
  'Toronto-East York': '#1898c0', 'Scarborough': '#d44545',
}

function worldTourGradient() {
  const visited = achievementCtx.value.visitedDistricts
  const locked = 'var(--color-border)'
  const segs = DISTRICT_ORDER.map((d, i) =>
    `${visited.includes(d) ? WORLD_TOUR_COLORS[d] : locked} ${i * 90}deg ${(i + 1) * 90}deg`
  )
  return `radial-gradient(circle, rgba(255,255,255,0.28) 0%, transparent 55%), conic-gradient(${segs.join(', ')})`
}

function compassGradient() {
  const v = achievementCtx.value.visitedBranchCodes
  const hit = '#f8f5f0', miss = 'var(--color-border)'
  const [n, e, s, w] = [compassPoints.n, compassPoints.e, compassPoints.s, compassPoints.w].map(c => v.has(c) ? hit : miss)
  return `conic-gradient(from -45deg, ${n} 0deg 90deg, ${e} 90deg 180deg, ${s} 180deg 270deg, ${w} 270deg 360deg)`
}

function compassLabelColor(dir, isNorth = false) {
  return achievementCtx.value.visitedBranchCodes.has(compassPoints[dir])
    ? (isNorth ? '#c0201a' : '#1a1510')
    : 'rgba(0,0,0,0.2)'
}
function compassLineColor(dir) {
  return achievementCtx.value.visitedBranchCodes.has(compassPoints[dir]) ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
}

function getBadgeColorClass(badge) {
  if (badge.id === 'world_tour' || badge.id === 'navigator') return null
  return badge.earned(achievementCtx.value) ? `badge-shape--${badge.id}` : 'badge-shape--locked'
}
function getBadgeInlineStyle(badge) {
  if (badge.id === 'world_tour') return { background: worldTourGradient() }
  if (badge.id === 'navigator')  return { background: compassGradient() }
  return {}
}
</script>

<style scoped>
/* Grid matches the stamp grid: 2 cols, center dashed divider, dashed row borders */
.endorsements-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}

/* Center vertical divider — matches stamp grid */
.endorsements-grid::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1.5px;
  background-image: repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 4px, transparent 4px, transparent 8px);
  background-size: 1.5px 8px;
  pointer-events: none;
}

.endorsement-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 12px;
  min-height: 140px;
  border-bottom: 1.5px dashed var(--color-border);
}

/* Remove bottom border from the last two items (final row) */
.endorsement-item:nth-last-child(-n+2) {
  border-bottom: none;
}

.badge-shape {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.badge-shape--octagon { clip-path: polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%); }
.badge-shape--circle  { border-radius: 50%; overflow: hidden; }
.badge-shape--star    { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
.badge-shape--star .badge-content { margin-top: 3px; }
.badge-shape--locked  { background: var(--color-border) !important; }
.badge-shape--locked .badge-content { color: var(--color-text-muted); }

.badge-shape--first        { background: radial-gradient(circle, #7ab4ec 0%, #3878c4 100%); }
.badge-shape--explorer     { background: radial-gradient(circle, #4a90d9 0%, #0048a8 100%); }
.badge-shape--adventurer   { background: radial-gradient(circle, #1e60b4 0%, #001e78 100%); }
.badge-shape--globetrotter { background: radial-gradient(circle, #002880 0%, #000e50 100%); }
.badge-shape--complete     { background: radial-gradient(circle, #001c70 0%, #000640 100%); }
.badge-shape--district_champ { background: radial-gradient(circle, #52cc84 0%, #1a6640 100%); }
.badge-shape--day_tripper,
.badge-shape--archivist,
.badge-shape--quest_master,
.badge-shape--familiar_face,
.badge-shape--return_visitor { background: radial-gradient(circle, #eaa040 0%, #9e3c14 100%); }

.badge-content {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  font-optical-sizing: auto;
  line-height: 1;
  position: relative;
  z-index: 1;
}
.compass-rose { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }

.badge-name {
  font-size: 0.62rem;
  font-weight: 600;
  text-align: center;
  color: var(--color-text-muted);
  letter-spacing: 0.01em;
  line-height: 1.3;
}
.badge-name--earned { color: var(--color-text); }

.badge-progress { display: flex; align-items: center; gap: 4px; }
.badge-progress__bar { width: 28px; height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
.badge-progress__fill { height: 100%; background: var(--color-text-muted); border-radius: 2px; min-width: 2px; }
.badge-progress__text { font-size: 0.52rem; font-weight: 600; color: var(--color-text-muted); line-height: 1; }
</style>
