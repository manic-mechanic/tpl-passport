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
          <template v-else-if="passport.visitCount === totalBranches">🎉 You've completed your passport!</template>
          <template v-else>{{ totalBranches - passport.visitCount }} branches left to collect</template>
        </p>
      </div>
      <!-- Decorative watermark -->
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
        <span class="stat-chip__num">{{ progressPct }}%</span>
        <span class="stat-chip__label">Complete</span>
      </div>
    </div>

    <!-- Recent visits -->
    <section class="recent-section">
      <div class="recent-header">
        <h2>Recent visits</h2>
        <NuxtLink to="/history" class="view-all">View all</NuxtLink>
      </div>

      <ul v-if="recentVisits.length" class="visit-list">
        <li v-for="visit in recentVisits" :key="visit.timestamp">
          <NuxtLink :to="`/branch/${visit.branchCode}`" class="visit-row">
            <div class="visit-stamp-dot" :style="{ background: stampColor(visit.branchCode).color }" />
            <div class="visit-info">
              <span class="visit-name">{{ branchMap[visit.branchCode] ?? visit.branchCode }}</span>
              <span class="visit-ward">{{ wardMap[visit.branchCode] }}</span>
            </div>
            <span class="visit-date">{{ formatDate(visit.timestamp) }}</span>
          </NuxtLink>
        </li>
      </ul>

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
import { useStampColor } from '~/composables/useStampColor'
import { physicalBranches } from '~/composables/useRegion'

const passport = usePassportStore()

const totalBranches = physicalBranches.length
const branchMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.BranchName]))
const wardMap   = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.WardName]))
const wardNoMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.WardNo]))

const progressPct = computed(() =>
  Math.round((passport.visitCount / totalBranches) * 100)
)

const recentVisits = computed(() => passport.checkIns.slice(0, 5))

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
  color: var(--tpl-navy);
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

/* Recent visits */
.recent-section { }

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

.visit-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.visit-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
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

.visit-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
