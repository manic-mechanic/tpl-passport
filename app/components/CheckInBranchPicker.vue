<template>
  <div class="branch-picker">
    <input
      v-model="query"
      type="text"
      class="picker-search"
      placeholder="Search branches…"
      autocomplete="off"
    />
    <button class="picker-locate-btn" @click="emit('locate')">
      <svg class="picker-locate-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
      Use my location
    </button>
    <div class="picker-list">
      <button
        v-for="b in filteredBranches"
        :key="b.BranchCode"
        class="picker-row"
        @click="emit('select', b.BranchCode)"
      >
        {{ b.BranchName }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { sortedBranches } from '~/composables/useRegion'

const emit = defineEmits<{
  select: [branchCode: string]
  locate: []
}>()

const query = ref('')

const filteredBranches = computed(() => {
  const q = query.value.toLowerCase().trim()
  return q ? sortedBranches.filter(b => b.BranchName.toLowerCase().includes(q)) : sortedBranches
})
</script>

<style scoped>
.branch-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 8px;
}

.picker-search {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--tpl-blue);
  }
}

.picker-locate-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--tpl-blue);
  cursor: pointer;
  padding: 2px 0;
  -webkit-tap-highlight-color: transparent;
}

.picker-locate-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.picker-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  max-height: 240px;
  overflow-y: auto;
}

.picker-row {
  display: block;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-bottom: 1px solid var(--color-border-soft);
  background: var(--color-surface);
  font-size: 0.9375rem;
  font-family: var(--font-body);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: var(--color-paper);
  }
}

/* QR primary area */
</style>
