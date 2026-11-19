<template>
  <section class="recent-visits">
    <div class="section-header">
      <h2>Recent visits</h2>
      <NuxtLink v-if="recentBranches.length" to="/passport" class="see-all">See all</NuxtLink>
    </div>

    <div class="stamp-strip">
      <button
        v-for="branch in recentBranches"
        :key="branch.BranchCode"
        type="button"
        class="stamp-slot"
        @click="emit('select', branch)"
      >
        <StampShape :branch-code="branch.BranchCode" :ward-no="branch.WardNo" :size="44" />
        <span class="stamp-label">{{ branch.BranchName }}</span>
      </button>
      <div v-for="ghost in GHOSTS.slice(0, placeholderCount)" :key="ghost.code" class="stamp-slot stamp-slot-empty">
        <StampShape :branch-code="ghost.code" :ward-no="ghost.ward" :size="44" />
      </div>
    </div>

    <p v-if="!recentBranches.length" class="empty-message">
      Check in at any branch to see your recent visits here.
    </p>
  </section>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'
const emit = defineEmits<{ select: [branch: Branch] }>()

const passport = usePassportStore()

// Most recently visited unique branches, newest first, up to 6.
// Relies on checkIns being newest-first — the store prepends with unshift() on each check-in.
const recentBranches = computed(() => {
  const seen = new Set<string>()
  const result: Branch[] = []
  for (const ci of passport.checkIns) {
    if (seen.has(ci.branchCode)) continue
    seen.add(ci.branchCode)
    const branch = physicalBranches.find(b => b.BranchCode === ci.branchCode)
    if (branch) result.push(branch)
    if (result.length >= 3) break
  }
  return result
})

const placeholderCount = computed(() => Math.max(0, 3 - recentBranches.value.length))

// Fake codes that hash to shape indices 0/1/2 — square, soft-square, circle
const GHOSTS = [
  { code: 'GH4', ward: 5 },
  { code: 'GH5', ward: 9 },
  { code: 'GH1', ward: 3 },
]
</script>

<style scoped>
.recent-visits {
  margin-bottom: 0;
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
  background: none;
  border: none;
  font: inherit;
  border-bottom: none;
  &.stamp-slot-empty {
    pointer-events: none;
    & :deep(.stamp-shape) {
      opacity: 0.15;
      filter: grayscale(1);
      box-shadow: none;
    }
    & :deep(.stamp-code) {
      display: none;
    }
  }
}

.stamp-label {
  font-size: 0.625rem;
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
