<template>
  <section v-if="passport.hasVisited(branchCode)" class="detail-section">
    <h2 class="detail-heading">
      Branch challenges
      <span class="challenge-tally">{{ completedHere }}/{{ BRANCH_CHALLENGES.length }} completed</span>
    </h2>
    <ul class="challenge-list">
      <li v-for="(challenge, i) in challengeStates" :key="i">
        <button
          type="button"
          class="challenge-item"
          :class="{ 'challenge-item-done': challenge.done }"
          @click="passport.toggleChallenge(branchCode, i)"
        >
          <svg class="challenge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <template v-if="challenge.icon === 'book'">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </template>
            <template v-else-if="challenge.icon === 'calendar'">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </template>
            <template v-else-if="challenge.icon === 'person'">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </template>
          </svg>
          <span class="challenge-label">{{ challenge.label }}</span>
          <svg v-if="challenge.done" class="challenge-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'

const props = defineProps({ branchCode: { type: String, required: true } })
const passport = usePassportStore()

const BRANCH_CHALLENGES = [
  { label: 'Check out a book here',   icon: 'book'     },
  { label: 'Attend a branch program', icon: 'calendar' },
  { label: 'Meet a librarian',        icon: 'person'   },
]

const challengeStates = computed(() =>
  BRANCH_CHALLENGES.map((c, i) => ({
    ...c,
    done: passport.hasCompletedChallenge(props.branchCode, i),
  }))
)

const completedHere = computed(() =>
  challengeStates.value.filter(c => c.done).length
)
</script>

<style scoped>
.challenge-tally {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.challenge-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.challenge-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  user-select: none;
  width: 100%;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  &:active {
    background: var(--color-paper);
  }
  &.challenge-item-done {
    color: var(--color-text);
    background: color-mix(in srgb, var(--tpl-blue) 5%, var(--color-surface));
    border-color: color-mix(in srgb, var(--tpl-blue) 22%, transparent);
    & .challenge-icon { stroke: var(--tpl-blue); }
  }
}

.challenge-label { flex: 1; }

.challenge-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: var(--color-text-muted);
  transition: stroke 0.12s;
}

.challenge-check {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke: var(--tpl-blue);
}
</style>
