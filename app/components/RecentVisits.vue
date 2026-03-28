<template>
  <section class="recent-visits">
    <div class="section-header">
      <h2>Recent Visits</h2>
      <NuxtLink v-if="recentBranches.length" to="/passport" class="see-all">See all</NuxtLink>
    </div>

    <div class="stamp-strip" :class="{ 'stamp-strip--single': rowLimit === 3 }">
      <NuxtLink
        v-for="branch in recentBranches"
        :key="branch.BranchCode"
        :to="`/branch/${branch.BranchCode}`"
        class="stamp-slot"
      >
        <StampShape :branchCode="branch.BranchCode" :wardNo="branch.WardNo" :size="44" />
        <span class="stamp-label">{{ branch.BranchName }}</span>
      </NuxtLink>
      <div v-for="i in placeholderCount" :key="`empty-${i}`" class="stamp-slot stamp-slot--empty">
        <StampShape :branchCode="GHOST_CODES[(i - 1) % GHOST_CODES.length]" :wardNo="GHOST_WARDS[(i - 1) % GHOST_WARDS.length]" :size="44" />
      </div>
    </div>

    <p v-if="!recentBranches.length" class="empty-message">
      Check in at any branch — your recent visits will appear here.
    </p>
  </section>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'

const passport = usePassportStore()

// Most recently visited unique branches, newest first, up to 6.
// Relies on checkIns being newest-first — the store prepends with unshift() on each check-in.
const recentBranches = computed(() => {
  const seen = new Set()
  const result = []
  for (const ci of passport.checkIns) {
    if (seen.has(ci.branchCode)) continue
    seen.add(ci.branchCode)
    const branch = physicalBranches.find(b => b.BranchCode === ci.branchCode)
    if (branch) result.push(branch)
    if (result.length >= 6) break
  }
  return result
})

const rowLimit = computed(() => recentBranches.value.length > 3 ? 6 : 3)
const placeholderCount = computed(() => Math.max(0, rowLimit.value - recentBranches.value.length))

// Fake codes that hash to shape indices 0/1/2 — square, soft-square, circle
const GHOST_CODES = ['GH4', 'GH5', 'GH1']
const GHOST_WARDS = [5, 9, 3]
</script>

<style scoped>
.recent-visits {
  margin-bottom: 14px;
}

.stamp-strip {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

/* Vertical dividers as pseudo-elements — border-right on grid cells gets clipped */
.stamp-strip::before,
.stamp-strip::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5px;
  background-image: repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 4px, transparent 4px, transparent 8px);
  background-size: 1.5px 8px;
  pointer-events: none;
}
.stamp-strip::before { left: calc(100% / 3); }
.stamp-strip::after  { left: calc(200% / 3); }

.stamp-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 4px;
  min-height: 84px;
  text-decoration: none;
  border-bottom: 1.5px dashed var(--color-border);
}

/* No bottom border on the last row (2-row layout) */
.stamp-slot:nth-child(n+4) {
  border-bottom: none;
}

/* Single row — no bottom border on any cell */
.stamp-strip--single .stamp-slot {
  border-bottom: none;
}

.stamp-slot--empty {
  pointer-events: none;
}

.stamp-slot--empty :deep(.stamp-shape) {
  opacity: 0.15;
  filter: grayscale(1);
  box-shadow: none;
}

.stamp-slot--empty :deep(.stamp-code) {
  display: none;
}

.stamp-label {
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--color-text-mid);
  text-align: center;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-message {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 12px 0 4px;
  line-height: 1.5;
}
</style>
