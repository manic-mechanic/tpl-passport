<template>
  <BaseSheet :open="open" aria-label="Welcome" @update:open="onOpenChange">
    <div class="welcome">
      <div class="book" aria-hidden="true">
        <div class="book-ribbon" />
        <div v-for="(page, p) in PAGES" :key="p" class="book-page" :class="`book-page--${p}`">
          <div v-for="s in page" :key="s.code" class="book-stamp" :style="{ left: `${s.x}%`, top: `${s.y}%` }">
            <StampShape :branch-code="s.code" :ward-no="wardOf(s.code)" :size="s.size" />
          </div>
        </div>
      </div>

      <h2 class="welcome-title">Library Passport</h2>
      <p class="welcome-text">Visit every Toronto Public Library branch and collect a stamp at each one.</p>

      <div class="welcome-actions">
        <NuxtLink :to="CHECK_IN_ROUTE" class="welcome-primary" @click="choose('checkin')">Check in</NuxtLink>
        <NuxtLink to="/make-passport" class="welcome-secondary" @click="choose('passport')">Make your passport</NuxtLink>
      </div>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
import { branchesByCode } from '~/composables/useRegion'
import { CHECK_IN_ROUTE } from '~/lib/checkInEntry'

// The first-visit welcome sheet (Test 1 of the onboarding tests). Home
// decides whether it shows; closing it any way counts as seen.

defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  choose: [panel: 'checkin' | 'passport']
}>()

const PAGES = [
  [{ code: 'LS', x: 2, y: 2, size: 92 }, { code: 'HP', x: 34, y: 38, size: 70 }, { code: 'BB', x: 2, y: 62, size: 66 }],
  [{ code: 'PK', x: 10, y: 2, size: 72 }, { code: 'SA', x: 20, y: 40, size: 88 }],
]

function wardOf(code: string) {
  return branchesByCode[code]?.WardNo ?? 1
}

function choose(panel: 'checkin' | 'passport') {
  emit('choose', panel)
  emit('update:open', false)
}

function onOpenChange(value: boolean) {
  emit('update:open', value)
}
</script>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 18px 24px;
}

.book {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 340px;
  aspect-ratio: 340 / 250;
  padding: 6px;
  border-radius: 6px;
  background: var(--tpl-navy);
  box-shadow: 0 18px 36px -12px rgba(0, 28, 113, 0.5);
  transform: rotate(-2deg);
}

.book-ribbon {
  position: absolute;
  right: 54px;
  top: -6px;
  z-index: 2;
  width: 14px;
  height: 70px;
  background: #c43c4e;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%);
}

.book-page {
  position: relative;
  flex: 1;
  overflow: hidden;
  background-color: var(--color-paper);
  background-image: repeating-radial-gradient(circle at 100% 50%, color-mix(in srgb, var(--tpl-blue) 7%, transparent) 0 1px, transparent 1px 8px);
}

.book-page--0 {
  border-radius: 3px 0 0 3px;
  box-shadow: inset -14px 0 18px -14px rgba(0, 0, 0, 0.25);
}

.book-page--1 {
  border-radius: 0 3px 3px 0;
  background-image: repeating-radial-gradient(circle at 0% 50%, color-mix(in srgb, var(--tpl-blue) 7%, transparent) 0 1px, transparent 1px 8px);
  box-shadow: inset 14px 0 18px -14px rgba(0, 0, 0, 0.25);
}

.book-stamp {
  position: absolute;
  padding: 10px;
}

.welcome-title {
  margin-top: 22px;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.02em;
  text-align: center;
  color: var(--color-brand-text);
  font-optical-sizing: auto;
}

.welcome-text {
  margin-top: 10px;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--color-text-mid);
  text-align: center;
}

.welcome-actions {
  margin-top: 24px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.welcome-primary,
.welcome-secondary {
  display: block;
  border-radius: var(--radius);
  text-align: center;
  text-decoration: none;
  font-weight: 700;
  transition: transform 0.1s;

  &:active {
    transform: scale(0.98);
  }
}

.welcome-primary {
  padding: 16px;
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  font-size: 1.0625rem;
  box-shadow: var(--shadow-accent);
}

.welcome-secondary {
  padding: 14px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  font-size: 1rem;
  font-weight: 600;
}
</style>
