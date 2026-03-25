<template>
  <main class="page-content">
    <header class="page-header">
      <h1>History</h1>
      <p class="sub" v-if="passport.checkIns.length">{{ passport.checkIns.length }} check-in{{ passport.checkIns.length !== 1 ? 's' : '' }}</p>
    </header>

    <!-- Stats summary -->
    <div v-if="passport.checkIns.length" class="stats-strip">
      <div class="stat-item">
        <span class="stat-num">{{ passport.checkIns.length }}</span>
        <span class="stat-lbl">Total visits</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <span class="stat-num">{{ passport.visitCount }}</span>
        <span class="stat-lbl">Branches</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <span class="stat-num">{{ weekStreak }}</span>
        <span class="stat-lbl">Week streak</span>
      </div>
    </div>

    <template v-if="passport.checkIns.length">
      <section v-for="[label, items] in grouped" :key="label" class="history-group">
        <p class="section-label">{{ label }}</p>
        <ul class="checkin-list">
          <li v-for="visit in items" :key="visit.timestamp" class="checkin-item">
            <NuxtLink :to="`/branch/${visit.branchCode}`" class="checkin-row">
              <div
                class="checkin-dot"
                :style="{ background: DISTRICT_COLORS[regionMap[visit.branchCode]] ?? 'var(--color-border)' }"
              />
              <div class="checkin-info">
                <span class="checkin-name">{{ branchMap[visit.branchCode] ?? visit.branchCode }}</span>
                <span class="checkin-meta">{{ regionMap[visit.branchCode] }}</span>
              </div>
              <span class="checkin-time">{{ formatTime(visit.timestamp) }}</span>
            </NuxtLink>
            <p v-if="visit.note" class="checkin-note">{{ visit.note }}</p>
          </li>
        </ul>
      </section>
    </template>

    <div v-else class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;stroke:var(--color-border);margin-bottom:8px">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <p>No check-ins yet.<br>Visit a branch to get started!</p>
    </div>
  </main>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches, DISTRICT_COLORS } from '~/composables/useRegion'

const passport = usePassportStore()

const branchMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.BranchName]))
const regionMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.District]))

const grouped = computed(() => {
  const now = new Date()
  const todayStr     = now.toDateString()
  const yesterdayStr = new Date(now - 86400000).toDateString()
  const weekAgo      = new Date(now - 7 * 86400000)

  const buckets = { 'Today': [], 'Yesterday': [], 'This week': [], 'Older': [] }
  for (const visit of passport.checkIns) {
    const d = new Date(visit.timestamp), ds = d.toDateString()
    if (ds === todayStr)          buckets['Today'].push(visit)
    else if (ds === yesterdayStr) buckets['Yesterday'].push(visit)
    else if (d > weekAgo)         buckets['This week'].push(visit)
    else                          buckets['Older'].push(visit)
  }
  return Object.entries(buckets).filter(([, items]) => items.length > 0)
})

// Week streak — consecutive calendar weeks (Mon–Sun) with at least one visit.
// If the most recent visit week isn't this week or last week, streak resets to 0.
const weekStreak = computed(() => {
  if (!passport.checkIns.length) return 0

  // Monday of the week containing a given date
  function weekStart(date) {
    const d = new Date(date)
    const day = d.getDay() || 7   // treat Sunday as 7
    d.setDate(d.getDate() - (day - 1))
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  const weeksWithVisit = new Set(passport.checkIns.map(c => weekStart(new Date(c.timestamp))))
  const thisWeek = weekStart(new Date())
  const lastWeekDate = new Date(thisWeek)
  lastWeekDate.setDate(lastWeekDate.getDate() - 7)
  const lastWeek = lastWeekDate.getTime()

  // Streak only counts if the user visited this week or last week
  if (!weeksWithVisit.has(thisWeek) && !weeksWithVisit.has(lastWeek)) return 0

  let streak = 0
  const cursorDate = new Date(weeksWithVisit.has(thisWeek) ? thisWeek : lastWeek)
  while (weeksWithVisit.has(cursorDate.getTime())) {
    streak++
    cursorDate.setDate(cursorDate.getDate() - 7)
  }
  return streak
})

function formatTime(iso) {
  const d = new Date(iso)
  if (d.toDateString() === new Date().toDateString())
    return d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.page-header {
  padding: 20px 0 16px;
}

.page-header h1 { margin-bottom: 3px; }

.sub {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

/* Stats strip */
.stats-strip {
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  margin-bottom: 22px;
  overflow: hidden;
}

.stat-item {
  flex: 1;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.stat-num {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--tpl-blue);
  line-height: 1;
  font-optical-sizing: auto;
}

.stat-lbl {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--color-border-soft);
  flex-shrink: 0;
}

.history-group {
  margin-bottom: 24px;
}

.checkin-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkin-item { }

.checkin-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  color: var(--color-text);
  text-decoration: none;
  box-shadow: var(--shadow-sm);
}

.checkin-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.checkin-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checkin-name {
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.checkin-meta {
  font-size: 0.73rem;
  color: var(--color-text-muted);
}

.checkin-time {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.checkin-note {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  padding: 8px 14px 10px;
  background: var(--color-paper);
  border: 1px solid var(--color-border-soft);
  border-top: none;
  border-radius: 0 0 var(--radius) var(--radius);
  margin-top: -4px;
  line-height: 1.5;
}
</style>
