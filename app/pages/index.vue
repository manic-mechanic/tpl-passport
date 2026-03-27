<template>
  <main class="page-content">
    <PassportCard />
    <AchievementsSection />

    <section class="recent-section">
      <div class="recent-header">
        <h2>Recent visit</h2>
        <NuxtLink to="/history" class="view-all">History →</NuxtLink>
      </div>

      <template v-if="recentActivity">
        <NuxtLink
          v-if="recentActivity.count === 1"
          :to="`/branch/${recentActivity.branches[0].branchCode}`"
          class="visit-row"
        >
          <div class="visit-dot" :style="{ background: stampColor(recentActivity.branches[0].branchCode).color }" />
          <div class="visit-info">
            <span class="visit-name">{{ branchMap[recentActivity.branches[0].branchCode] ?? recentActivity.branches[0].branchCode }}</span>
            <span class="visit-meta">{{ regionMap[recentActivity.branches[0].branchCode] }}</span>
          </div>
          <span class="visit-date">{{ formatDate(recentActivity.timestamp) }}</span>
        </NuxtLink>

        <NuxtLink v-else to="/history" class="visit-row">
          <div class="visit-dot visit-dot--multi" />
          <div class="visit-info">
            <span class="visit-name">{{ recentActivity.count }} branches visited</span>
            <span class="visit-meta">{{ formatDate(recentActivity.timestamp) }}</span>
          </div>
          <span class="visit-date">View all →</span>
        </NuxtLink>
      </template>

      <div v-else class="empty-state">
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

const branchMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.BranchName]))
const regionMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.District]))
const wardNoMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.WardNo]))

const recentActivity = computed(() => {
  if (!passport.checkIns.length) return null
  const first = passport.checkIns[0]
  const firstDate = new Date(first.timestamp).toDateString()
  const group = passport.checkIns.filter(c => new Date(c.timestamp).toDateString() === firstDate)
  return { count: group.length, branches: group, timestamp: first.timestamp }
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
.recent-section { margin-bottom: 24px; }

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.recent-header h2 { font-size: 1.05rem; }

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

.visit-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.visit-dot--multi { background: var(--tpl-blue); }

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

.visit-meta {
  font-size: 0.73rem;
  color: var(--color-text-muted);
}

.visit-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.empty-state {
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
