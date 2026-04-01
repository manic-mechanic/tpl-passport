<template>
  <div class="nearby-list">
    <NuxtLink
      v-for="branch in branches"
      :key="branch.BranchCode"
      :to="`/branch/${branch.BranchCode}`"
      class="nearby-row"
    >
      <StampShape :branchCode="branch.BranchCode" :wardNo="branch.WardNo" :size="36" />
      <div class="nearby-info">
        <span class="nearby-name">{{ branch.BranchName }}</span>
        <span class="nearby-dist">
          {{ formatDist(branch.distKm) }} away<template v-if="showDistrict"> · {{ branch.District }}</template>
        </span>
      </div>
      <svg class="nearby-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </NuxtLink>
  </div>
</template>

<script setup>
import { formatDist } from '~/composables/useRegion'

defineProps({
  branches:     { type: Array,   required: true },
  showDistrict: { type: Boolean, default: false },
})
</script>

<style scoped>
.nearby-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nearby-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--color-text);
  transition: background 0.12s;

  &:active { background: var(--color-paper); }
}

.nearby-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nearby-name {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
}

.nearby-dist {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.nearby-arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: var(--color-text-muted);
}
</style>
