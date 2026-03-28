<template>
  <div class="endorsements-grid">
    <button
      v-for="badge in displayAchievements"
      :key="badge.id"
      class="endorsement-item"
      @click="openSheet(badge)"
    >
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
        <template v-else-if="badge.id === 'page_turner'" />
        <span v-else class="badge-content">{{ badge.stat ? badge.stat(achievementCtx) : badge.label }}</span>
      </div>

      <span class="badge-name" :class="{ 'badge-name--earned': badge.earned(achievementCtx) }">{{ badge.title }}</span>

      <div v-if="showBadgeProgress(badge)" class="badge-progress">
        <div class="badge-progress__bar">
          <div class="badge-progress__fill" :style="{ width: badgeProgressPct(badge) + '%' }" />
        </div>
        <span class="badge-progress__text">{{ badgeProgressLabel(badge) }}</span>
      </div>
    </button>
  </div>

  <!-- Endorsement detail sheet (vaul-vue) -->
  <DrawerRoot v-model:open="sheetOpen" :noBodyStyles="true">
    <DrawerPortal>
      <DrawerOverlay class="endo-overlay" />
      <DrawerContent class="endo-sheet" :style="{ height: props.sheetHeight }" :aria-label="activeBadge?.title + ' endorsement detail'">
        <div class="sheet-handle-row"><div class="sheet-handle-bar" /></div>
        <button class="sheet-close" @click="sheetOpen = false" aria-label="Close">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="6" y1="6" x2="14" y2="14"/><line x1="14" y1="6" x2="6" y2="14"/>
          </svg>
        </button>

        <div v-if="activeBadge" class="endo-scroll">
          <!-- Large badge -->
          <div class="endo-badge-wrap">
            <div
              class="badge-shape badge-shape--large"
              :class="[`badge-shape--${activeBadge.shape}`, getBadgeColorClass(activeBadge)]"
              :style="getBadgeInlineStyle(activeBadge)"
            >
              <template v-if="activeBadge.id === 'navigator'">
                <svg class="compass-rose" viewBox="0 0 64 64" aria-hidden="true">
                  <defs>
                    <linearGradient id="compass-border-grad2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#e0e0e0"/><stop offset="50%" stop-color="#888"/><stop offset="100%" stop-color="#ccc"/>
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="30" fill="none" stroke="url(#compass-border-grad2)" stroke-width="4"/>
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
              <template v-else-if="activeBadge.id === 'page_turner'" />
              <span v-else class="badge-content">{{ activeBadge.stat ? activeBadge.stat(achievementCtx) : activeBadge.label }}</span>
            </div>
          </div>

          <h2 class="endo-title">{{ activeBadge.title }}</h2>
          <p class="endo-desc">{{ activeBadge.desc }}</p>

          <!-- Earned / progress status -->
          <div v-if="activeBadge.earned(achievementCtx)" class="endo-status endo-status--earned">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 8 6.5 11.5 13 4.5"/>
            </svg>
            Earned{{ earnedDate(activeBadge) ? ' · ' + earnedDate(activeBadge) : '' }}
          </div>
          <div v-else-if="activeBadge.progress" class="endo-progress-wrap">
            <div class="endo-progress-bar">
              <div class="endo-progress-fill" :style="{ width: badgeProgressPct(activeBadge) + '%' }" />
            </div>
            <span class="endo-progress-label">{{ badgeProgressLabel(activeBadge) }}</span>
          </div>

          <!-- Badge-specific detail -->

          <!-- Navigator: compass branches -->
          <div v-if="activeBadge.id === 'navigator'" class="endo-detail-list">
            <div v-for="[dir, label] in [['n','North'],['e','East'],['s','South'],['w','West']]" :key="dir" class="endo-detail-row" :class="{ 'endo-detail-row--done': achievementCtx.visitedBranchCodes.has(compassPoints[dir]) }">
              <span class="endo-detail-check">{{ achievementCtx.visitedBranchCodes.has(compassPoints[dir]) ? '✓' : '·' }}</span>
              <span class="endo-detail-text"><span class="endo-detail-dir">{{ label }}</span> — {{ branchName(compassPoints[dir]) }}</span>
            </div>
          </div>

          <!-- Page Turner: one branch per page -->
          <div v-if="activeBadge.id === 'page_turner'" class="endo-detail-list">
            <div v-for="page in branchesByAlphaPage" :key="page.label" class="endo-detail-row" :class="{ 'endo-detail-row--done': page.branches.some(b => achievementCtx.visitedBranchCodes.has(b.BranchCode)) }">
              <span class="endo-detail-check">{{ page.branches.some(b => achievementCtx.visitedBranchCodes.has(b.BranchCode)) ? '✓' : '·' }}</span>
              <span class="endo-detail-text">{{ page.label }}</span>
            </div>
          </div>

          <!-- Page Filler: fill one complete page -->
          <div v-if="activeBadge.id === 'page_filler'" class="endo-detail-list">
            <div v-for="page in branchesByAlphaPage" :key="page.label" class="endo-detail-row" :class="{ 'endo-detail-row--done': page.branches.every(b => achievementCtx.visitedBranchCodes.has(b.BranchCode)) }">
              <span class="endo-detail-check">{{ page.branches.every(b => achievementCtx.visitedBranchCodes.has(b.BranchCode)) ? '✓' : '·' }}</span>
              <span class="endo-detail-text">{{ page.label }}</span>
              <span class="endo-detail-count">{{ page.branches.filter(b => achievementCtx.visitedBranchCodes.has(b.BranchCode)).length }}/{{ page.branches.length }}</span>
            </div>
          </div>

          <!-- Familiar Face: home branch -->
          <div v-if="activeBadge.id === 'familiar_face' && passport.profile.homeBranch" class="endo-detail-list">
            <div class="endo-detail-row" :class="{ 'endo-detail-row--done': activeBadge.earned(achievementCtx) }">
              <span class="endo-detail-check">{{ activeBadge.earned(achievementCtx) ? '✓' : '·' }}</span>
              <span class="endo-detail-text">{{ branchName(passport.profile.homeBranch) }}</span>
              <span class="endo-detail-count">{{ achievementCtx.homeVisitCount }}/5 visits</span>
            </div>
          </div>
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<script setup>
import { DrawerRoot, DrawerPortal, DrawerOverlay, DrawerContent } from 'vaul-vue'
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, branchesByAlphaPage } from '~/composables/useRegion'
import { ACHIEVEMENTS, buildAchievementCtx, compassPoints } from '~/composables/useAchievements'

const props = defineProps({ sheetHeight: { type: String, default: 'calc(100dvh - var(--nav-height) - 76px)' } })
const passport = usePassportStore()

const achievementCtx = computed(() => buildAchievementCtx({
  checkIns:            passport.checkIns,
  visitedBranchCodes:  passport.visitedBranchCodes,
  completedChallenges: passport.completedChallenges,
  homeBranch:          passport.profile.homeBranch,
}))

const activeBadge = ref(null)
const sheetOpen   = ref(false)

function openSheet(badge) {
  activeBadge.value = badge
  sheetOpen.value = true
}

// Column-major display order (2 cols, left col first):
const DISPLAY_ORDER = [
  'first',        'day_tripper',
  'archivist',    'navigator',
  'explorer',     'familiar_face',
  'adventurer',   'page_filler',
  'globetrotter', 'page_turner',
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

// For count-based badges, find the date the Nth unique branch was visited
function earnedDate(badge) {
  if (!badge.earned(achievementCtx.value) || !badge.progress) return null
  const threshold = badge.progress(achievementCtx.value).total
  const sorted = [...passport.checkIns].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const seen = new Set()
  for (const ci of sorted) {
    if (!seen.has(ci.branchCode)) {
      seen.add(ci.branchCode)
      if (seen.size === threshold) {
        return new Date(ci.timestamp).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
      }
    }
  }
  return null
}

function branchName(code) {
  return physicalBranches.find(b => b.BranchCode === code)?.BranchName ?? code
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

const PAGE_TURNER_COLORS = ['#e07832', '#52cc84', '#1898c0', '#d44545', '#8f5fe0']

function pageTurnerGradient() {
  const locked = 'var(--color-border)'
  const segs = branchesByAlphaPage.map((page, i) => {
    const color = page.branches.some(b => achievementCtx.value.visitedBranchCodes.has(b.BranchCode))
      ? PAGE_TURNER_COLORS[i] : locked
    return `${color} ${i * 72}deg, ${color} ${(i + 1) * 72}deg`
  })
  return `conic-gradient(from -36deg, ${segs.join(', ')})`
}

function getBadgeColorClass(badge) {
  if (badge.id === 'navigator' || badge.id === 'page_turner') return null
  return badge.earned(achievementCtx.value) ? `badge-shape--${badge.id}` : 'badge-shape--locked'
}
function getBadgeInlineStyle(badge) {
  if (badge.id === 'navigator')   return { background: compassGradient() }
  if (badge.id === 'page_turner') return { background: pageTurnerGradient() }
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
  /* Reset button */
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  width: 100%;
  box-sizing: border-box;
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
.badge-shape--large {
  width: 88px;
  height: 88px;
}
.badge-shape--octagon { clip-path: polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%); }
.badge-shape--circle  { border-radius: 50%; overflow: hidden; }
.badge-shape--star    { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
.badge-shape--star .badge-content { margin-top: 3px; }
.badge-shape--locked  { background: var(--color-border) !important; }
.badge-shape--locked .badge-content { color: var(--color-text-muted); }

.badge-shape--first        { background: radial-gradient(circle, #7ab4ec 0%, #3878c4 100%); }
.badge-shape--explorer     { background: radial-gradient(circle, #4a90d9 0%, #0048a8 100%); }
.badge-shape--adventurer   { background: radial-gradient(circle, #2e74c8 0%, #0030a0 100%); }
.badge-shape--globetrotter { background: radial-gradient(circle, #1e60b4 0%, #001e78 100%); }
.badge-shape--complete     { background: radial-gradient(circle, #001c70 0%, #000640 100%); }
.badge-shape--page_filler  { background: radial-gradient(circle, #52cc84 0%, #1a6640 100%); }
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
.badge-shape--large .badge-content { font-size: 1.375rem; }
.compass-rose { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }

.badge-name {
  font-size: 0.625rem;
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
.badge-progress__text { font-size: 0.5rem; font-weight: 600; color: var(--color-text-muted); line-height: 1; }

/* ── Endorsement sheet ── */
:global(.endo-overlay) {
  position: fixed;
  top: 0; left: 0; right: 0;
  bottom: var(--nav-height);
  background: rgba(0, 0, 0, 0.42);
  z-index: 90;
}

:global(.endo-sheet) {
  position: fixed;
  bottom: var(--nav-height) !important;
  left: 0; right: 0;
  margin: 0 auto;
  max-width: 480px;
  background: var(--color-bg) !important;
  border-radius: 20px 20px 0 0;
  z-index: 90;
  overflow: hidden;
  outline: none;
}

.sheet-handle-row {
  display: flex;
  justify-content: center;
  padding: 14px 0 8px;
}
.sheet-handle-bar {
  width: 36px;
  height: 4px;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 2px;
}
@media (prefers-color-scheme: dark) { .sheet-handle-bar { background: rgba(255,255,255,0.2); } }
:global([data-theme="dark"]) .sheet-handle-bar { background: rgba(255,255,255,0.2); }

.sheet-close {
  position: absolute;
  top: 10px; right: 14px;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  cursor: pointer;
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
  z-index: 1;
}
.sheet-close:active { background: rgba(0, 0, 0, 0.2); }
.sheet-close svg { width: 16px; height: 16px; }
@media (prefers-color-scheme: dark) {
  .sheet-close { background: rgba(255,255,255,0.14); }
  .sheet-close:active { background: rgba(255,255,255,0.24); }
}
:global([data-theme="dark"]) .sheet-close { background: rgba(255,255,255,0.14); }
:global([data-theme="dark"]) .sheet-close:active { background: rgba(255,255,255,0.24); }

.endo-scroll {
  overflow-y: auto;
  height: calc(100% - 48px);
  padding: 4px 20px 32px;
}

.endo-badge-wrap {
  display: flex;
  justify-content: center;
  padding: 12px 0 16px;
}

.endo-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  text-align: center;
  color: var(--color-brand-text);
  margin-bottom: 8px;
  line-height: 1.25;
}

.endo-desc {
  font-size: 0.875rem;
  color: var(--color-text-mid);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 20px;
}

.endo-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 20px;
}
.endo-status--earned {
  color: #1a7a3c;
}
.endo-status--earned svg {
  width: 14px; height: 14px;
  stroke: #1a7a3c;
  flex-shrink: 0;
}
@media (prefers-color-scheme: dark) { .endo-status--earned { color: #5ccea0; } .endo-status--earned svg { stroke: #5ccea0; } }
:global([data-theme="dark"]) .endo-status--earned { color: #5ccea0; }
:global([data-theme="dark"]) .endo-status--earned svg { stroke: #5ccea0; }

.endo-progress-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}
.endo-progress-bar {
  width: 120px; height: 5px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}
.endo-progress-fill {
  height: 100%;
  background: var(--tpl-blue);
  border-radius: 3px;
  min-width: 3px;
}
.endo-progress-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

/* Detail rows (Navigator, Page Turner, Page Filler, Familiar Face) */
.endo-detail-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.endo-detail-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  color: var(--color-text-muted);
}
.endo-detail-row--done { color: var(--color-text); }

@media (prefers-color-scheme: dark) { .endo-detail-row { background: rgba(255,255,255,0.05); } }
:global([data-theme="dark"]) .endo-detail-row { background: rgba(255,255,255,0.05); }

.endo-detail-check {
  font-size: 0.8125rem;
  font-weight: 700;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
  color: var(--tpl-blue);
}
.endo-detail-row:not(.endo-detail-row--done) .endo-detail-check {
  color: var(--color-border);
}

.endo-detail-text {
  font-size: 0.8125rem;
  flex: 1;
  line-height: 1.3;
}
.endo-detail-dir {
  font-weight: 600;
}

.endo-detail-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
</style>
