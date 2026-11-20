<template>
  <div v-if="badgeSuggestions.length === 0" class="extra-credit-empty">
    <p>You've earned every badge.</p>
  </div>
  <div v-else class="badge-suggestions">
    <div v-for="s in badgeSuggestions" :key="s.id" class="suggestion-card">
      <div class="suggestion-badge" :class="s.shape" :style="{ background: badgeBg(s.id) }">
        <span v-if="s.displayLabel" class="suggestion-badge-label">{{ s.displayLabel }}</span>
      </div>
      <div class="suggestion-body">
        <div class="suggestion-header">
          <span class="suggestion-title">{{ s.title }}</span>
          <div class="suggestion-bar">
            <div class="suggestion-fill" :style="{ width: (s.pct * 100) + '%' }" />
          </div>
        </div>
        <p class="suggestion-message">{{ s.message }}</p>
        <div v-if="s.branches.length" class="suggestion-branches">
          <p class="suggestion-subhead">Suggested:</p>
          <BranchCard v-for="b in s.branches" :key="b.BranchCode" :branch="b" compact as-button
                      @select="$emit('open-branch', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Badge, BadgeCtx, Branch } from '@tpl-passport/shared'
import { BADGES, activityBadgeStat, useBadgeCtx, badgeBg } from '~/composables/useBadges'

// Extra Credit tab: the three unearned badges the user is closest to.
defineEmits<{ 'open-branch': [branch: Branch] }>()

// ── Badge Suggestions ─────────────────────────────────────────────────
const badgeCtx = useBadgeCtx()

const badgeSuggestions = computed(() => {
  const ctx = badgeCtx.value
  return BADGES
    .filter(a => !a.earned(ctx))
    .map(a => ({ id: a.id, title: a.title, shape: a.shape, displayLabel: suggestionBadgeLabel(a, ctx), ...a.suggest(ctx) }))
    .filter(s => s.message)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
})

function suggestionBadgeLabel(badge: Badge, ctx: BadgeCtx) {
  return activityBadgeStat(badge, ctx) ?? badge.label ?? null
}

</script>

<style scoped>
/* ── Badge Suggestions ───────────────────────────────────────────── */
.badge-suggestions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.suggestion-badge {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.suggestion-badge.octagon {
  clip-path: polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%);
}

.suggestion-badge.circle {
  border-radius: 50%;
}

.suggestion-badge.star {
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

.suggestion-badge-label {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.suggestion-body {
  flex: 1;
  min-width: 0;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.suggestion-title {
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  color: var(--color-text);
}

.suggestion-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.suggestion-fill {
  height: 100%;
  background: var(--tpl-blue);
  border-radius: 2px;
  transition: width 0.3s ease;
  min-width: 2px;
}

.suggestion-message {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  margin: 0 0 8px;
}

.suggestion-branches {
  margin-left: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.suggestion-subhead {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin-bottom: 2px;
}
</style>
