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

    <!-- Passport hero card -->
    <section class="passport-card">
      <div class="passport-card__inner">
        <div class="passport-card__top">
          <div>
            <p class="passport-card__eyebrow">Your Passport</p>
            <p class="passport-card__greeting">
              {{ passport.profile.name || 'Collector' }}
            </p>
          </div>
          <div class="passport-card__badge">
            <span class="badge-num">{{ passport.visitCount }}</span>
            <span class="badge-denom">/ {{ totalBranches }}</span>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPct + '%' }" />
        </div>
        <p class="passport-card__sub">
          <template v-if="passport.visitCount === 0">Visit your first branch to start collecting stamps</template>
          <template v-else-if="passport.visitCount === totalBranches">You've completed your passport!</template>
          <template v-else>{{ totalBranches - passport.visitCount }} branches left to collect</template>
        </p>
      </div>
      <img src="/tpl-meta.png" class="passport-card__watermark" aria-hidden="true" />
    </section>

    <!-- Stats row -->
    <div class="stats-row">
      <div class="stat-chip">
        <span class="stat-chip__num">{{ passport.checkIns.length }}</span>
        <span class="stat-chip__label">Visits</span>
      </div>
      <div class="stat-chip">
        <span class="stat-chip__num">{{ passport.visitCount }}</span>
        <span class="stat-chip__label">Branches</span>
      </div>
      <div class="stat-chip">
        <span class="stat-chip__num">{{ overallPct }}%</span>
        <span class="stat-chip__label">Complete</span>
      </div>
    </div>

    <!-- Achievements -->
    <section class="achievements-section">
      <div class="recent-header">
        <h2>Achievements</h2>
      </div>

      <!-- Earned badges — octagon/badge shape, 3-column grid -->
      <div v-if="earnedBadges.length" class="badges-grid">
        <div
          v-for="badge in earnedBadges"
          :key="badge.id"
          class="badge-item"
          :title="badge.desc"
        >
          <div class="badge-hex">
            <span class="badge-milestone">{{ badge.threshold === 1 ? '1st' : badge.threshold }}</span>
          </div>
          <span class="badge-name">{{ badge.title }}</span>
        </div>
      </div>

      <!-- Next badge goal -->
      <div v-if="nextBadge" class="next-badge card">
        <div class="next-badge__header">
          <span class="next-badge__eyebrow">Next goal</span>
          <span class="next-badge__fraction">{{ passport.visitCount }} / {{ nextBadge.threshold }}</span>
        </div>
        <div class="next-badge__body">
          <div class="badge-hex badge-hex--locked">
            <span class="badge-milestone">{{ nextBadge.threshold === 1 ? '1st' : nextBadge.threshold }}</span>
          </div>
          <div class="next-badge__text">
            <p class="next-badge__title">{{ nextBadge.title }}</p>
            <p class="next-badge__desc">{{ nextBadge.desc }}</p>
          </div>
        </div>
        <div class="next-badge__track">
          <div class="next-badge__fill" :style="{ width: nextBadgePct + '%' }" />
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
import { useStampColor } from '~/composables/useStamp'
import { physicalBranches } from '~/composables/useRegion'

const passport = usePassportStore()

const totalBranches = physicalBranches.length
const totalItems = totalBranches * 4 // 1 stamp + 3 challenges per branch

const branchMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.BranchName]))
const regionMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.District]))
const wardNoMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.WardNo]))

const progressPct  = computed(() => Math.round((passport.visitCount / totalBranches) * 100))
const overallPct   = computed(() => Math.round(((passport.visitCount + passport.completedChallengesCount) / totalItems) * 100))

// Achievements — milestone numbers instead of emoji for a more considered look
const ACHIEVEMENTS = [
  { id: 'first',      title: 'First Stamp',   desc: 'Check in at your first branch',    threshold: 1  },
  { id: 'local',      title: 'Local',          desc: 'Visit 5 branches',                 threshold: 5  },
  { id: 'explorer',   title: 'Explorer',       desc: 'Visit 10 branches',                threshold: 10 },
  { id: 'adventurer', title: 'Adventurer',     desc: 'Visit 25 branches',                threshold: 25 },
  { id: 'halfway',    title: 'Half Passport',  desc: 'Visit 50 branches',                threshold: 50 },
  { id: 'nearly',     title: 'Almost There',   desc: 'Visit 75 branches',                threshold: 75 },
  { id: 'complete',   title: 'Full Passport',  desc: `Visit all ${totalBranches} branches`, threshold: totalBranches },
]

const earnedBadges = computed(() =>
  ACHIEVEMENTS.filter(a => passport.visitCount >= a.threshold)
)

const nextBadge = computed(() =>
  ACHIEVEMENTS.find(a => passport.visitCount < a.threshold) ?? null
)

const nextBadgePct = computed(() => {
  if (!nextBadge.value) return 100
  const prev = earnedBadges.value.at(-1)?.threshold ?? 0
  const range = nextBadge.value.threshold - prev
  return Math.round(((passport.visitCount - prev) / range) * 100)
})

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

/* Passport hero card */
.passport-card {
  position: relative;
  background: var(--tpl-navy);
  border-radius: var(--radius-lg);
  padding: 22px 22px 20px;
  margin-bottom: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.passport-card__inner { position: relative; z-index: 1; }

.passport-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.passport-card__eyebrow {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.5);
  margin-bottom: 4px;
}

.passport-card__greeting {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  font-optical-sizing: auto;
}

.passport-card__badge {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: var(--radius-pill);
  padding: 4px 12px;
  display: flex;
  align-items: baseline;
  gap: 2px;
  white-space: nowrap;
}

.badge-num {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
}

.badge-denom {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.55);
}

.progress-track {
  height: 6px;
  background: rgba(255,255,255,0.15);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: var(--tpl-blue);
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 4px;
}

.passport-card__sub {
  font-size: 0.82rem;
  color: rgba(255,255,255,0.55);
}

.passport-card__watermark {
  position: absolute;
  right: -20px;
  top: 50%;
  transform: translateY(-50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  opacity: 0.06;
  filter: brightness(10);
  pointer-events: none;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}

.stat-chip {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  padding: 14px 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  box-shadow: var(--shadow-sm);
}

.stat-chip__num {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--tpl-blue);
  line-height: 1;
  font-optical-sizing: auto;
}

.stat-chip__label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* Achievements */
.achievements-section {
  margin-bottom: 24px;
}

/* 3-column grid of hexagonal badge shapes */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 8px;
  margin-bottom: 14px;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

/* Octagon badge — clip-path gives the official stamp/medal shape */
.badge-hex {
  width: 72px;
  height: 72px;
  background: var(--tpl-navy);
  clip-path: polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.badge-hex--locked {
  background: var(--color-border);
}

.badge-milestone {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
  font-optical-sizing: auto;
  line-height: 1;
}

.badge-hex--locked .badge-milestone {
  color: var(--color-text-muted);
}

.badge-name {
  font-size: 0.62rem;
  font-weight: 600;
  text-align: center;
  color: var(--color-text-muted);
  letter-spacing: 0.01em;
  line-height: 1.3;
}

/* Next badge goal */
.next-badge {
  padding: 14px 16px;
}

.next-badge__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.next-badge__eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.next-badge__fraction {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--tpl-blue);
}

.next-badge__body {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.next-badge__text { flex: 1; }

.next-badge__title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
}

.next-badge__desc {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-top: 1px;
}

.next-badge__track {
  height: 5px;
  background: var(--color-border-soft);
  border-radius: 3px;
  overflow: hidden;
}

.next-badge__fill {
  height: 100%;
  background: var(--tpl-blue);
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 4px;
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
