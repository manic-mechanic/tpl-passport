<template>
  <main class="page-content">
    <header class="page-header">
      <button class="back-link" @click="goBack">
        <IconBack />
        Passport
      </button>
      <h1>History</h1>
      <p v-if="passport.checkIns.length" class="sub">
        {{ passport.checkIns.length }} check-in{{ passport.checkIns.length
          !== 1 ? 's' : '' }}
      </p>
    </header>
    <div class="header-gap" />

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
        <span class="stat-num">{{ memoryCount }}</span>
        <span class="stat-lbl">Memories</span>
      </div>
    </div>

    <div v-if="passport.checkIns.length" class="filter-bar">
      <button class="filter-pill" :class="{ active: memoriesOnly }"
              @click="memoriesOnly = !memoriesOnly"
      >
        Memories
      </button>
    </div>

    <template v-if="passport.checkIns.length">
      <template v-if="grouped.length">
        <section v-for="[label, items] in grouped" :key="label" class="history-group">
          <p class="section-label">{{ label }}</p>
          <ul class="checkin-list">
            <li v-for="visit in items" :key="visit.timestamp">
              <BranchCard
                v-if="branchObjectMap[visit.branchCode]"
                :branch="branchObjectMap[visit.branchCode]"
                :meta="formatTime(visit.timestamp)"
                :has-note="!!visit.note"
                :has-photo="!!photoUrls[visit.timestamp]"
                as-button
                @select="openSheet"
              />
            </li>
          </ul>
        </section>
      </template>
      <p v-else class="empty-filtered">No memories yet. Add a note or photo when checking in.</p>
    </template>

    <div v-else class="empty-state">
      <IconClock />
      <p>No check-ins yet.<br>Visit a branch to get started.</p>
    </div>
  </main>

  <BaseSheet v-model:open="sheetOpen" :height="sheetHeight">
    <BranchDetail v-if="activeBranch" :branch="activeBranch" source="history" @open-branch="openSheet" />
  </BaseSheet>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'
import { getPhotoUrl } from '~/composables/usePhotoStore'
import { localDayKey } from '@tpl-passport/shared'
import IconClock from '~/components/icons/IconClock.vue'
import IconBack from '~/components/icons/IconBack.vue'

const { $posthog } = useNuxtApp()
const passport = usePassportStore()
const router = useRouter()

onMounted(() => {
  $posthog?.capture('history_viewed')
})

const branchObjectMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b]))

const memoriesOnly = ref(false)

const memoryCount = computed(() => passport.checkIns.filter(isMemory).length)

function isMemory(visit) {
  return !!(visit.note?.trim() || visit.hasPhoto)
}

const grouped = computed(() => {
  const now = new Date()
  const todayStr = localDayKey(now)
  const yesterdayStr = localDayKey(new Date(now.getTime() - 86400000))
  const weekAgo = new Date(now - 7 * 86400000)

  const source = memoriesOnly.value ? passport.checkIns.filter(isMemory) : passport.checkIns

  const buckets = { 'Today': [], 'Yesterday': [], 'This week': [], 'Older': [] }
  for (const visit of source) {
    const d = new Date(visit.timestamp)
    const ds = localDayKey(d)
    if (ds === todayStr) buckets['Today'].push(visit)
    else if (ds === yesterdayStr) buckets['Yesterday'].push(visit)
    else if (d > weekAgo) buckets['This week'].push(visit)
    else buckets['Older'].push(visit)
  }
  return Object.entries(buckets).filter(([, items]) => items.length > 0)
})

// Photo thumbnails — loaded on demand from IndexedDB
const photoUrls = ref({})
async function loadPhoto(timestamp) {
  if (timestamp in photoUrls.value) return
  photoUrls.value[timestamp] = await getPhotoUrl(timestamp)
}
onMounted(() => {
  passport.checkIns.forEach(c => loadPhoto(c.timestamp))
})

onUnmounted(() => {
  Object.values(photoUrls.value).forEach(url => url && URL.revokeObjectURL(url))
})

function formatTime(iso) {
  const d = new Date(iso)
  if (localDayKey(d) === localDayKey(new Date()))
    return d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

const sheetOpen = ref(false)
const activeBranch = ref(null)
const sheetHeight = 'calc(100svh - var(--nav-height) - 60px)'

function openSheet(branch) {
  activeBranch.value = branch
  sheetOpen.value = true
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  navigateTo('/passport')
}
</script>

<style scoped>
.page-header {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 10;
  margin: 0 -18px;
  padding: 14px 18px 16px;
  background: var(--tpl-navy);

  & h1 {
    margin-bottom: 3px;
    color: rgba(255, 255, 255, 0.92);
  }
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.72);
  background: none;
  border: none;
  padding: 0;
  margin-bottom: 6px;
  cursor: pointer;

  & svg {
    width: 16px;
    height: 16px;
  }
}

.header-gap {
  height: 20px;
}

.sub {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.55);
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
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--tpl-blue);
  line-height: 1;
  font-optical-sizing: auto;
}

.stat-lbl {
  font-size: 0.625rem;
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

.filter-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}

.filter-pill {
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;

  &.active {
    background: var(--tpl-navy);
    border-color: var(--tpl-navy);
    color: #fff;
  }
}

.empty-filtered {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 32px 0;
  line-height: 1.6;
}

.empty-state svg {
  width: 36px;
  height: 36px;
  stroke: var(--color-border);
  margin-bottom: 8px
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
</style>
