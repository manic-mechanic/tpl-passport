<template>
  <NuxtLink v-if="!asButton" :to="`/branch/${branch.BranchCode}`" class="branch-row">
    <div class="branch-dot" :style="dotStyle" />
    <div class="branch-info">
      <span class="branch-name">{{ branch.BranchName }}</span>
      <span v-if="!noMeta" class="branch-meta">{{ region }}</span>
    </div>
    <div class="branch-right">
      <svg v-if="visited" class="visited-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <svg v-else class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  </NuxtLink>
  <button v-else type="button" class="branch-row" @click="$emit('select', branch)">
    <div class="branch-dot" :style="dotStyle" />
    <div class="branch-info">
      <span class="branch-name">{{ branch.BranchName }}</span>
      <span v-if="!noMeta" class="branch-meta">{{ region }}</span>
    </div>
    <div class="branch-right">
      <svg v-if="visited" class="visited-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <svg v-else class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  </button>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { getDistrictColor } from '~/composables/useRegion'

const props = defineProps({
  branch:   { type: Object, required: true },
  distance: { type: String, default: null },
  asButton: { type: Boolean, default: false },
  noMeta:   { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const passport = usePassportStore()

const visited  = computed(() => passport.hasVisited(props.branch.BranchCode))
const region   = computed(() => props.distance ?? props.branch.District ?? '')
const dotStyle = computed(() => ({
  background: visited.value
    ? getDistrictColor(props.branch.District)
    : 'var(--color-border)',
}))
</script>

<style scoped>
.branch-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  color: var(--color-text);
  text-decoration: none;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.12s;
}

.branch-row:active {
  background: var(--color-paper);
  border-color: var(--color-border);
}

.branch-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.2s;
}

.branch-info {
  flex: 1;
  min-width: 0;
}

.branch-name {
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.branch-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.branch-right { flex-shrink: 0; }

.visited-check { width: 16px; height: 16px; stroke: var(--tpl-blue); }
.chevron       { width: 16px; height: 16px; stroke: var(--color-border); }
</style>
