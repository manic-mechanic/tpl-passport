<template>
  <section v-if="recentBranches.length" class="recent-stamps">
    <div class="section-header">
      <h2>Recent Stamps</h2>
      <NuxtLink to="/passport" class="see-all">See all</NuxtLink>
    </div>

    <div class="stamp-strip">
      <NuxtLink
        v-for="branch in recentBranches"
        :key="branch.BranchCode"
        :to="`/branch/${branch.BranchCode}`"
        class="stamp-item"
      >
        <StampShape :branchCode="branch.BranchCode" :wardNo="branch.WardNo" :size="52" />
        <span class="stamp-label">{{ branch.BranchName }}</span>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'

const passport = usePassportStore()

// Most recently visited unique branches, newest first, up to 6
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
</script>

<style scoped>
.recent-stamps {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h2 {
  font-size: 1.05rem;
}

.see-all {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--tpl-blue);
  text-decoration: none;
}

.stamp-strip {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 4px;
  /* Hide scrollbar — still scrollable */
  scrollbar-width: none;
}
.stamp-strip::-webkit-scrollbar { display: none; }

.stamp-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  text-decoration: none;
  flex-shrink: 0;
  width: 80px;
  padding: 8px 4px;
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
  max-width: 72px;
}
</style>
