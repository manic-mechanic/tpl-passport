<template>
  <NuxtLink v-if="!asButton" :to="`/branch/${branch.BranchCode}`" class="branch-card"
            :class="{ 'branch-card-compact': compact }"
  >
    <span v-if="index !== null" class="card-index">{{ index }}</span>
    <div class="card-stamp" :class="{ 'card-stamp-ghost': !visited }">
      <StampShape :branch-code="branch.BranchCode" :ward-no="branch.WardNo" :size="stampSize" />
    </div>
    <div class="card-info">
      <span class="card-name">{{ branch.BranchName }}</span>
      <span class="card-meta">{{ metaLine }}</span>
    </div>
    <div class="card-trailing">
      <IconNote v-if="hasNote" class="card-indicator" aria-label="Has note" />
      <IconPhoto v-if="hasPhoto" class="card-indicator" aria-label="Has photo" />
      <IconChevron class="card-chevron" />
    </div>
  </NuxtLink>
  <button v-else type="button" class="branch-card" :class="{ 'branch-card-compact': compact }"
          @click="$emit('select', branch)"
  >
    <span v-if="index !== null" class="card-index">{{ index }}</span>
    <div class="card-stamp" :class="{ 'card-stamp-ghost': !visited }">
      <StampShape :branch-code="branch.BranchCode" :ward-no="branch.WardNo" :size="stampSize" />
    </div>
    <div class="card-info">
      <span class="card-name">{{ branch.BranchName }}</span>
      <span class="card-meta">{{ metaLine }}</span>
    </div>
    <div class="card-trailing">
      <IconNote v-if="hasNote" class="card-indicator" aria-label="Has note" />
      <IconPhoto v-if="hasPhoto" class="card-indicator" aria-label="Has photo" />
      <IconChevron class="card-chevron" />
    </div>
  </button>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import IconChevron from './icons/IconChevron.vue'
import IconNote from './icons/IconNote.vue'
import IconPhoto from './icons/IconPhoto.vue'

const props = defineProps({
  branch: { type: Object, required: true },
  distance: { type: String, default: null },
  meta: { type: String, default: null },  // overrides computed meta line
  index: { type: Number, default: null },
  hasNote: { type: Boolean, default: false },
  hasPhoto: { type: Boolean, default: false },
  asButton: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const stampSize = computed(() => props.compact ? 32 : 40)

defineEmits(['select'])

const passport = usePassportStore()
const visited = computed(() => passport.hasVisited(props.branch.BranchCode))

const metaLine = computed(() => {
  if (props.meta !== null) return props.meta
  const locPart = props.distance
    ? `${props.distance} away`
    : (props.branch.Address?.split(',')[0] ?? '')
  return locPart
})
</script>

<style scoped>
.branch-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  color: var(--color-text);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  width: 100%;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s;

  &:active {
    background: var(--color-paper);
    border-color: var(--color-border);
  }

  &.branch-card-compact {
    padding: 8px 10px;
    box-shadow: none;

    & .card-stamp {
      width: 32px;
      height: 32px;
    }
  }
}

.card-index {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.card-stamp {
  width: 40px;
  height: 40px;
  flex-shrink: 0;

  &.card-stamp-ghost {
    opacity: 0.35;
    filter: grayscale(1);
  }
}

.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-name {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.card-trailing {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.card-indicator {
  width: 14px;
  height: 14px;
  stroke: var(--color-text-muted);
  flex-shrink: 0;
}

.card-chevron {
  width: 16px;
  height: 16px;
  stroke: var(--color-border);
  flex-shrink: 0;
}
</style>
