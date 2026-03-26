<template>
  <main class="page-content">

    <!-- Header -->
    <header class="page-header">
      <div class="brand">
        <img src="/tpl-meta.png" class="tpl-logo" alt="Toronto Public Library" />
        <span class="brand-title">passport<span class="brand-colon">:</span></span>
      </div>
      <NuxtLink to="/settings" class="profile-btn" aria-label="Settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </NuxtLink>
    </header>

    <!-- Passport document card -->
    <section class="passport-doc">
      <div class="doc-header">
        <img src="/tpl-meta-card.png" class="doc-seal" alt="" aria-hidden="true" />
        <div class="doc-header-text">
          <p class="doc-country">Canada · Toronto Public Library</p>
          <p class="doc-type">PASSPORT / PASSEPORT</p>
        </div>
        <span class="doc-type-code">P</span>
      </div>
      <div class="doc-body">
        <div class="doc-name-row">
          <div>
            <p class="doc-field-label">Name / Nom</p>
            <p class="doc-name">{{ passport.profile.name || 'Collector' }}</p>
          </div>
          <div class="doc-count-badge">
            <span class="doc-count-badge__num">{{ passport.visitCount }}</span>
            <span class="doc-count-badge__denom">/ {{ totalBranches }}</span>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPct + '%' }" />
        </div>
        <div class="doc-stats-line">
          <div class="doc-stat-inline">
            <span class="doc-stat-num">{{ passport.checkIns.length }}</span>
            <span class="doc-stat-label">Visits</span>
          </div>
          <div class="doc-stat-inline">
            <span class="doc-stat-num">{{ overallPct }}%</span>
            <span class="doc-stat-label">Complete</span>
          </div>
        </div>
      </div>
      <div class="doc-mrz">
        <p class="doc-mrz-line">P&lt;CAN{{ mrzLine1 }}</p>
        <p class="doc-mrz-line">{{ mrzLine2 }}</p>
      </div>
    </section>

    <!-- Achievements -->
    <section class="achievements-section">
      <div class="recent-header">
        <h2>Achievements</h2>
      </div>

      <!-- All 12 badges — earned = colored, locked = gray -->
      <div class="badges-grid">
        <div
          v-for="badge in ACHIEVEMENTS"
          :key="badge.id"
          class="badge-item"
          :title="badge.desc"
        >
          <div
            class="badge-shape"
            :class="[
              `badge-shape--${badge.shape}`,
              getBadgeColorClass(badge)
            ]"
            :style="getBadgeInlineStyle(badge)"
          >
            <template v-if="badge.id === 'compass'">
              <svg class="compass-rose" viewBox="0 0 64 64" aria-hidden="true">
                <defs>
                  <linearGradient id="compass-border-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%"   stop-color="#e0e0e0"/>
                    <stop offset="50%"  stop-color="#888888"/>
                    <stop offset="100%" stop-color="#cccccc"/>
                  </linearGradient>
                </defs>
                <!-- Silver border ring -->
                <circle cx="32" cy="32" r="30" fill="none" stroke="url(#compass-border-grad)" stroke-width="4"/>
                <!-- Diagonal lines — sit exactly on the conic-gradient quadrant boundaries -->
                <line x1="14" y1="14" x2="50" y2="50" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
                <line x1="50" y1="14" x2="14" y2="50" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
                <!-- N arrow -->
                <polygon points="32,5 28.5,13 35.5,13" :fill="compassLabelColor('n', true)"/>
                <!-- Cardinal ticks — E, S, W -->
                <line x1="60" y1="32" x2="51" y2="32" stroke-width="1.5" :stroke="compassLineColor('e')"/>
                <line x1="32" y1="60" x2="32" y2="51" stroke-width="1.5" :stroke="compassLineColor('s')"/>
                <line x1="4"  y1="32" x2="13" y2="32" stroke-width="1.5" :stroke="compassLineColor('w')"/>
                <!-- Direction labels -->
                <text x="32" y="22" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="800" :fill="compassLabelColor('n', true)">N</text>
                <text x="45" y="33" text-anchor="middle" dominant-baseline="middle" font-size="9"  font-weight="700" :fill="compassLabelColor('e')">E</text>
                <text x="32" y="45" text-anchor="middle" dominant-baseline="middle" font-size="9"  font-weight="700" :fill="compassLabelColor('s')">S</text>
                <text x="19" y="33" text-anchor="middle" dominant-baseline="middle" font-size="9"  font-weight="700" :fill="compassLabelColor('w')">W</text>
                <!-- Centre dot -->
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
            <span class="badge-progress__text">{{ badge.progress(achievementCtx).current }}/{{ badge.progress(achievementCtx).total }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent visit — most recent day, aggregated if multiple -->
    <section class="recent-section">
      <div class="recent-header">
        <h2>Recent visit</h2>
        <NuxtLink to="/history" class="view-all">History →</NuxtLink>
      </div>

      <template v-if="recentActivity">
        <!-- Single branch visit -->
        <NuxtLink
          v-if="recentActivity.count === 1"
          :to="`/branch/${recentActivity.branches[0].branchCode}`"
          class="visit-row"
        >
          <div class="visit-stamp-dot" :style="{ background: stampColor(recentActivity.branches[0].branchCode).color }" />
          <div class="visit-info">
            <span class="visit-name">{{ branchMap[recentActivity.branches[0].branchCode] ?? recentActivity.branches[0].branchCode }}</span>
            <span class="visit-ward">{{ regionMap[recentActivity.branches[0].branchCode] }}</span>
          </div>
          <span class="visit-date">{{ formatDate(recentActivity.timestamp) }}</span>
        </NuxtLink>

        <!-- Multiple branches same day -->
        <NuxtLink v-else to="/history" class="visit-row">
          <div class="visit-stamp-dot visit-stamp-dot--multi" />
          <div class="visit-info">
            <span class="visit-name">{{ recentActivity.count }} branches visited</span>
            <span class="visit-ward">{{ formatDate(recentActivity.timestamp) }}</span>
          </div>
          <span class="visit-date">View all →</span>
        </NuxtLink>
      </template>

      <div v-else class="empty-card">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
        </svg>
        <p>No check-ins yet</p>
        <NuxtLink to="/explore" class="cta-link">Find a branch →</NuxtLink>
      </div>
    </section>

  </main>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { storeToRefs } from 'pinia'
import { useStampColor } from '~/composables/useStamp'
import { physicalBranches, DISTRICT_ORDER } from '~/composables/useRegion'

const passport = usePassportStore()

const totalBranches = physicalBranches.length
const totalItems = totalBranches * 4 // 1 stamp + 3 challenges per branch

const branchMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.BranchName]))
const regionMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.District]))
const wardNoMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.WardNo]))

const { progressPct } = storeToRefs(passport)
const overallPct = computed(() => Math.round(((passport.visitCount + passport.completedChallengesCount) / totalItems) * 100))

const issueYear = new Date().getFullYear()

const mrzLine1 = computed(() => {
  const raw = (passport.profile.name || 'COLLECTOR').toUpperCase()
  const parts = raw.replace(/[^A-Z ]/g, '').split(' ').filter(Boolean)
  const surname = parts[0] ?? 'COLLECTOR'
  const given   = parts.slice(1).join('<') || ''
  const nameStr = given ? `${surname}<<${given}` : `${surname}`
  return nameStr.padEnd(39, '<').slice(0, 39)
})

const mrzLine2 = computed(() => {
  const num  = `TPL${String(passport.visitCount).padStart(5, '0')}`
  const dob  = String(issueYear % 100).padStart(2, '0') + '0101'
  const pct  = String(overallPct.value).padStart(3, '0')
  const raw  = `${num}0CAN${dob}0M260101${pct}PCT`
  return raw.padEnd(44, '<').slice(0, 44)
})

// Precomputed constants for achievements (not reactive)
// compassPoints: the furthest branch in each cardinal direction by Lat/Long
const compassPoints = (() => {
  let n = physicalBranches[0], s = physicalBranches[0]
  let e = physicalBranches[0], w = physicalBranches[0]
  for (const b of physicalBranches) {
    if (parseFloat(b.Lat) > parseFloat(n.Lat)) n = b
    if (parseFloat(b.Lat) < parseFloat(s.Lat)) s = b
    if (parseFloat(b.Long) > parseFloat(e.Long)) e = b
    if (parseFloat(b.Long) < parseFloat(w.Long)) w = b
  }
  return { n: n.BranchCode, s: s.BranchCode, e: e.BranchCode, w: w.BranchCode }
})()
const compassBranches = new Set(Object.values(compassPoints))

const districtBranchCounts = physicalBranches.reduce((acc, b) => {
  acc[b.District] = (acc[b.District] ?? 0) + 1
  return acc
}, {})

// Computed helpers for achievement context
const branchVisitCounts = computed(() => {
  const counts = {}
  for (const c of passport.checkIns) {
    counts[c.branchCode] = (counts[c.branchCode] ?? 0) + 1
  }
  return counts
})

const visitedDistricts = computed(() => {
  const seen = new Set()
  for (const code of passport.visitedBranchCodes) {
    const b = physicalBranches.find(br => br.BranchCode === code)
    if (b) seen.add(b.District)
  }
  return [...seen]
})

const maxBranchesInOneDay = computed(() => {
  const byDay = {}
  for (const c of passport.checkIns) {
    const day = c.timestamp.slice(0, 10)
    if (!byDay[day]) byDay[day] = new Set()
    byDay[day].add(c.branchCode)
  }
  const sizes = Object.values(byDay).map(s => s.size)
  return sizes.length ? Math.max(...sizes) : 0
})

const homeVisitCount = computed(() => {
  const home = passport.profile.homeBranch
  return home ? (branchVisitCounts.value[home] ?? 0) : 0
})

const maxNonHomeVisitCount = computed(() => {
  const home = passport.profile.homeBranch
  let max = 0
  for (const [code, count] of Object.entries(branchVisitCounts.value)) {
    if (code !== home && count > max) max = count
  }
  return max
})

// Reactive context object passed to each achievement's earned/stat/progress functions
const achievementCtx = computed(() => ({
  visitCount: passport.visitCount,
  visitedDistricts: visitedDistricts.value,
  branchVisitCounts: branchVisitCounts.value,
  maxBranchesInOneDay: maxBranchesInOneDay.value,
  homeVisitCount: homeVisitCount.value,
  maxNonHomeVisitCount: maxNonHomeVisitCount.value,
  visitedBranchCodes: passport.visitedBranchCodes,
  completedChallenges: passport.completedChallenges,
}))

// Column-major order: groups run vertically across the 3×4 grid.
// Stamps fill col 0 (rows 0–3) + col 1 row 3 overflow.
// Circles fill col 1 rows 0–2. Stars fill col 2 all rows.
// Template order: [s,c,h, s,c,h, s,c,h, s,s,h]
const ACHIEVEMENTS = [
  // row 0
  {
    id: 'first', title: 'First Stamp', desc: 'Check in at your first branch',
    shape: 'octagon', label: '1st',
    earned: (ctx) => ctx.visitCount >= 1,
    progress: (ctx) => ({ current: ctx.visitCount, total: 1 }),
  },
  {
    id: 'world_tour', title: 'World Tour', desc: 'Visit a branch in every district',
    shape: 'circle',
    earned: (ctx) => ctx.visitedDistricts.length >= 4,
  },
  {
    id: 'day_tripper', title: 'Day Tripper', desc: 'Visit 2+ branches in one day',
    shape: 'star',
    earned: (ctx) => ctx.maxBranchesInOneDay >= 2,
    stat: (ctx) => ctx.maxBranchesInOneDay,
    progress: (ctx) => ({ current: ctx.maxBranchesInOneDay, total: 2 }),
  },
  // row 1
  {
    id: 'explorer', title: 'Explorer', desc: 'Visit 10 branches',
    shape: 'octagon', label: '10',
    earned: (ctx) => ctx.visitCount >= 10,
    progress: (ctx) => ({ current: ctx.visitCount, total: 10 }),
  },
  {
    id: 'district_champ', title: 'District Champ', desc: 'Complete all branches in any district',
    shape: 'circle', label: '★',
    earned: (ctx) => {
      const visited = {}
      for (const code of ctx.visitedBranchCodes) {
        const b = physicalBranches.find(br => br.BranchCode === code)
        if (b) visited[b.District] = (visited[b.District] ?? 0) + 1
      }
      return Object.entries(districtBranchCounts).some(([d, total]) => (visited[d] ?? 0) >= total)
    },
  },
  {
    id: 'quest_master', title: 'Quest Master', desc: 'Complete all challenges at any branch',
    shape: 'star', label: '✓',
    earned: (ctx) => physicalBranches.some(b =>
      ctx.completedChallenges.includes(`${b.BranchCode}:0`) &&
      ctx.completedChallenges.includes(`${b.BranchCode}:1`) &&
      ctx.completedChallenges.includes(`${b.BranchCode}:2`)
    ),
  },
  // row 2
  {
    id: 'adventurer', title: 'Adventurer', desc: 'Visit 25 branches',
    shape: 'octagon', label: '25',
    earned: (ctx) => ctx.visitCount >= 25,
    progress: (ctx) => ({ current: ctx.visitCount, total: 25 }),
  },
  {
    id: 'compass', title: 'Compass',
    desc: 'Visit the furthest branch in each direction: Goldhawk Park (N), Port Union (E), Long Branch (S), Humberwood (W)',
    shape: 'circle',
    earned: (ctx) => [...compassBranches].every(code => ctx.visitedBranchCodes.has(code)),
  },
  {
    id: 'familiar_face', title: 'Familiar Face', desc: 'Check in at your home branch 5 times',
    shape: 'star',
    earned: (ctx) => ctx.homeVisitCount >= 5,
    stat: (ctx) => ctx.homeVisitCount,
    progress: (ctx) => ({ current: ctx.homeVisitCount, total: 5 }),
  },
  // row 3 — stamps overflow into col 1
  {
    id: 'globetrotter', title: 'Globetrotter', desc: 'Visit 50 branches',
    shape: 'octagon', label: '50',
    earned: (ctx) => ctx.visitCount >= 50,
    progress: (ctx) => ({ current: ctx.visitCount, total: 50 }),
  },
  {
    id: 'complete', title: 'Full Passport', desc: `Visit all ${totalBranches} branches`,
    shape: 'octagon', label: '100',
    earned: (ctx) => ctx.visitCount >= 100,
    progress: (ctx) => ({ current: ctx.visitCount, total: 100 }),
  },
  {
    id: 'return_visitor', title: 'Return Visitor', desc: 'Check in at any branch 3+ times',
    shape: 'star',
    earned: (ctx) => ctx.maxNonHomeVisitCount >= 3,
    stat: (ctx) => ctx.maxNonHomeVisitCount,
    progress: (ctx) => ({ current: ctx.maxNonHomeVisitCount, total: 3 }),
  },
]

// ID of the next unearned stamp — only that one gets a progress pill
const nextStampId = computed(() =>
  ACHIEVEMENTS.find(a => a.shape === 'octagon' && !a.earned(achievementCtx.value))?.id ?? null
)

// Returns true if a badge should show an inline progress pill
function showBadgeProgress(badge) {
  if (badge.earned(achievementCtx.value) || !badge.progress) return false
  if (badge.progress(achievementCtx.value).current === 0) return false
  if (badge.shape === 'octagon') return badge.id === nextStampId.value
  return true
}

function badgeProgressPct(badge) {
  const { current, total } = badge.progress(achievementCtx.value)
  return Math.min(100, Math.round((current / total) * 100))
}

// Brighter district colors for World Tour badge (more vivid than the dot/border palette)
const WORLD_TOUR_COLORS = {
  'Etobicoke-York':    '#e07832',
  'North York':        '#8f5fe0',
  'Toronto-East York': '#1898c0',
  'Scarborough':       '#d44545',
}

// World Tour: conic-gradient with one 90° segment per district (clockwise from top)
// Each segment uses a bright district color if visited, or locked-grey if not.
function worldTourGradient() {
  const visited = visitedDistricts.value
  const locked = 'var(--color-border)'
  const segments = DISTRICT_ORDER.map((d, i) => {
    const color = visited.includes(d) ? WORLD_TOUR_COLORS[d] : locked
    return `${color} ${i * 90}deg ${(i + 1) * 90}deg`
  })
  const highlight = 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, transparent 55%)'
  return `${highlight}, conic-gradient(${segments.join(', ')})`
}

// Compass: conic-gradient with N/E/S/W quadrants (from -45deg so N is centred at top)
// Visited = bright white compass face; unvisited = locked grey.
function compassGradient() {
  const visited = achievementCtx.value.visitedBranchCodes
  const hit = '#f8f5f0'
  const miss = 'var(--color-border)'
  const n = visited.has(compassPoints.n) ? hit : miss
  const e = visited.has(compassPoints.e) ? hit : miss
  const s = visited.has(compassPoints.s) ? hit : miss
  const w = visited.has(compassPoints.w) ? hit : miss
  return `conic-gradient(from -45deg, ${n} 0deg 90deg, ${e} 90deg 180deg, ${s} 180deg 270deg, ${w} 270deg 360deg)`
}

// Returns fill colour for a compass rose label — muted when unvisited, prominent when visited.
// N gets red (classic compass convention) when visited.
function compassLabelColor(dir, isNorth = false) {
  const visited = achievementCtx.value.visitedBranchCodes.has(compassPoints[dir])
  if (visited) return isNorth ? '#c0201a' : '#1a1510'
  return 'rgba(0,0,0,0.2)'
}

// Returns stroke colour for a compass rose line half — faint when unvisited.
function compassLineColor(dir) {
  const visited = achievementCtx.value.visitedBranchCodes.has(compassPoints[dir])
  return visited ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
}

// Returns the CSS class for badge background color.
// world_tour and compass use inline style gradients instead.
function getBadgeColorClass(badge) {
  if (badge.id === 'world_tour' || badge.id === 'compass') return null
  return badge.earned(achievementCtx.value) ? `badge-shape--${badge.id}` : 'badge-shape--locked'
}

// Returns inline style for badges that use dynamic gradients.
function getBadgeInlineStyle(badge) {
  if (badge.id === 'world_tour') return { background: worldTourGradient() }
  if (badge.id === 'compass')    return { background: compassGradient() }
  return {}
}

// Group most recent day's check-ins — show count if multiple on same day
const recentActivity = computed(() => {
  if (!passport.checkIns.length) return null
  const first = passport.checkIns[0]
  const firstDate = new Date(first.timestamp).toDateString()
  const group = passport.checkIns.filter(c => new Date(c.timestamp).toDateString() === firstDate)
  return {
    count: group.length,
    branches: group,
    timestamp: first.timestamp,
  }
})

function stampColor(branchCode) {
  return useStampColor(wardNoMap[branchCode] ?? 1)
}

function formatDate(iso) {
  const d = new Date(iso)
  if (d.toDateString() === new Date().toDateString()) return 'Today'
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tpl-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.brand-title {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-brand-text);
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
}

.brand-colon {
  color: var(--tpl-blue);
}

.profile-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-mid);
  box-shadow: var(--shadow-sm);
}

.profile-btn svg { width: 18px; height: 18px; }

/* Passport document hero card */
.passport-doc {
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(0,28,113,0.12);
  margin-bottom: 14px;
}

.doc-header {
  background: var(--tpl-navy);
  padding: 9px 14px;
  display: flex;
  align-items: center;
  gap: 9px;
}

.doc-seal {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: contain;
  opacity: 0.7;
}

.doc-header-text { flex: 1; }

.doc-country {
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.42);
}

.doc-type {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.88);
  margin-top: 1px;
}

.doc-type-code {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(255,255,255,0.14);
  line-height: 1;
}

.doc-body {
  background: #f4efe4;
  padding: 14px 16px 12px;
  border-top: 1px solid rgba(100,170,248,0.45);
  border-bottom: 1px solid rgba(100,170,248,0.45);
}

.doc-name-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 11px;
}

.doc-field-label {
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9a9490;
  margin-bottom: 2px;
}

.doc-name {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--tpl-navy);
  line-height: 1.1;
  font-optical-sizing: auto;
}

.doc-count-badge {
  background: rgba(0,28,113,0.07);
  border: 1px solid rgba(0,28,113,0.14);
  border-radius: var(--radius-pill);
  padding: 3px 10px;
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
  margin-top: 2px;
}

.doc-count-badge__num {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--tpl-navy);
  font-optical-sizing: auto;
}

.doc-count-badge__denom {
  font-size: 0.75rem;
  color: rgba(0,28,113,0.45);
}

.progress-track {
  height: 5px;
  background: rgba(0,28,113,0.14);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 11px;
}

.progress-fill {
  height: 100%;
  background: var(--tpl-blue);
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 2px;
}

.doc-stats-line {
  display: flex;
  align-items: center;
}

.doc-stat-inline {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding-right: 14px;
  margin-right: 14px;
  border-right: 1px solid rgba(0,28,113,0.12);
}

.doc-stat-inline:last-child {
  border-right: none;
  padding-right: 0;
  margin-right: 0;
}

.doc-stat-num {
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--tpl-blue);
  font-optical-sizing: auto;
}

.doc-stat-label {
  font-size: 0.62rem;
  font-weight: 600;
  color: #9a9490;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.doc-mrz {
  background: var(--tpl-navy);
  padding: 8px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.doc-mrz-line {
  font-family: 'Courier New', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: rgba(255,255,255,0.28);
  white-space: nowrap;
  overflow: hidden;
}

/* Achievements */
.achievements-section {
  margin-bottom: 24px;
}

/* 3-column grid — always shows all 12 badges */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 8px;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

/* Base badge shape */
.badge-shape {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* Octagon — passport stamps */
.badge-shape--octagon {
  clip-path: polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%);
}

/* Circle — geography */
.badge-shape--circle {
  border-radius: 50%;
  overflow: hidden;
}

/* 5-point star — habit */
.badge-shape--star {
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

/* Locked state — overrides group color */
.badge-shape--locked {
  background: var(--color-border) !important;
}

.badge-shape--locked .badge-content {
  color: var(--color-text-muted);
}

/* Passport stamp colors — radial light→dark, progression maintained across the set */
.badge-shape--first        { background: radial-gradient(circle, #7ab4ec 0%, #3878c4 100%); }
.badge-shape--explorer     { background: radial-gradient(circle, #4a90d9 0%, #0048a8 100%); }
.badge-shape--adventurer   { background: radial-gradient(circle, #1e60b4 0%, #001e78 100%); }
.badge-shape--globetrotter { background: radial-gradient(circle, #002880 0%, #000e50 100%); }
.badge-shape--complete     { background: radial-gradient(circle, #001c70 0%, #000640 100%); }

/* Geography badge color — radial green (world_tour + compass use inline gradients) */
.badge-shape--district_champ { background: radial-gradient(circle, #52cc84 0%, #1a6640 100%); }

/* Habit badge color — warm amber radial */
.badge-shape--day_tripper,
.badge-shape--quest_master,
.badge-shape--familiar_face,
.badge-shape--return_visitor { background: radial-gradient(circle, #eaa040 0%, #9e3c14 100%); }

/* Badge content — centered number or symbol */
.badge-content {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
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

/* Star clip-path bottom tips reach 91%, so visual centre is ~45.5% — nudge content down */
.badge-shape--star .badge-content {
  margin-top: 3px;
}

.badge-name {
  font-size: 0.62rem;
  font-weight: 600;
  text-align: center;
  color: var(--color-text-muted);
  letter-spacing: 0.01em;
  line-height: 1.3;
}

.badge-name--earned {
  color: var(--color-text);
}

/* Inline progress pill — shown below locked badges with trackable progress */
.badge-progress {
  display: flex;
  align-items: center;
  gap: 4px;
}

.badge-progress__bar {
  width: 28px;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.badge-progress__fill {
  height: 100%;
  background: var(--color-text-muted);
  border-radius: 2px;
  min-width: 2px;
}

.badge-progress__text {
  font-size: 0.52rem;
  font-weight: 600;
  color: var(--color-text-muted);
  line-height: 1;
}

/* Recent visit — single compact row */
.recent-section { margin-bottom: 24px; }

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.recent-header h2 {
  font-size: 1.05rem;
}

.view-all {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--tpl-blue);
}

.visit-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.visit-stamp-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.visit-stamp-dot--multi {
  background: var(--tpl-blue);
}

.visit-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.visit-name {
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visit-ward {
  font-size: 0.73rem;
  color: var(--color-text-muted);
}

.visit-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* Empty state */
.empty-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  box-shadow: var(--shadow-sm);
}

.empty-icon {
  width: 32px;
  height: 32px;
  stroke: var(--color-border);
  margin-bottom: 4px;
}

.cta-link {
  margin-top: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tpl-blue);
}
</style>
