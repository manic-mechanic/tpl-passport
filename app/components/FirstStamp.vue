<template>
  <section class="first-stamp" aria-labelledby="first-stamp-title">
    <div class="stage" aria-hidden="true">
      <div class="big-stamp">
        <StampShape :branch-code="branch.BranchCode" :ward-no="branch.WardNo" :size="220" />
      </div>
      <div class="postmark">
        <span class="postmark-small">TORONTO</span>
        <span class="postmark-day">{{ postmark.day }}</span>
        <span class="postmark-small">{{ postmark.year }}</span>
      </div>
      <span v-for="(s, i) in SPECKS" :key="i" class="speck" :style="{ ...s, background: ink }" />
      <div class="first-badge">
        <span class="first-badge-tape" />
        <span class="first-badge-mark">1st</span>
        <span class="first-badge-text">First Stamp</span>
      </div>
    </div>

    <h1 id="first-stamp-title" class="title">First stamp!</h1>
    <p class="branch-name">{{ branch.BranchName }}</p>

    <div class="tracker" role="img" :aria-label="`${visitCount} of ${total} branches`">
      <span v-for="i in total" :key="i" class="tracker-cell" :style="i <= visitCount ? { background: ink } : undefined" />
    </div>
    <p class="tracker-count">{{ visitCount }} / {{ total }}</p>

    <NuxtLink v-if="!passportMade" to="/make-passport" class="btn" @click="$posthog?.capture('first_stamp_next', { action: 'passport' })">
      Make your passport
    </NuxtLink>
    <NuxtLink to="/" class="link" @click="$posthog?.capture('first_stamp_next', { action: 'home' })">Back to Home</NuxtLink>
  </section>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { BRANCH_TIME_ZONE } from '@tpl-passport/shared'
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'
import { isPassportMade } from '~/lib/onboarding'
import { stampHue } from '~/lib/stampHue'

// The first check-in's visit page: a big stamp, a postmark with the day,
// and the 100-branch tracker, then on to making the passport.

const props = defineProps<{
  branch: Branch
  timestamp: string
}>()

const { $posthog } = useNuxtApp()
const passport = usePassportStore()

const total = physicalBranches.length
const visitCount = computed(() => passport.visitCount)
const passportMade = computed(() => isPassportMade(passport.profile))
const ink = computed(() => `hsl(${stampHue(props.branch.WardNo)}, 62%, 45%)`)

const postmark = computed(() => {
  const date = new Date(props.timestamp)
  const day = date.toLocaleDateString('en-CA', { timeZone: BRANCH_TIME_ZONE, day: 'numeric', month: 'short' })
  return {
    day: day.replace(/\./g, '').toUpperCase(),
    year: date.toLocaleDateString('en-CA', { timeZone: BRANCH_TIME_ZONE, year: 'numeric' }),
  }
})

// Ink spattered around the stamp
const SPECKS = [
  { left: '16%', top: '18%', width: '7px', height: '7px', opacity: 0.55 },
  { left: '12%', top: '66%', width: '4px', height: '4px', opacity: 0.5 },
  { right: '18%', top: '14%', width: '5px', height: '5px', opacity: 0.5 },
  { right: '38%', top: '90%', width: '3px', height: '3px', opacity: 0.5 },
]

onMounted(() => {
  $posthog?.capture('first_stamp_shown', { branch_code: props.branch.BranchCode })
})
</script>

<style scoped>
.first-stamp {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-bottom: 8px;
}

.stage {
  position: relative;
  width: 100%;
  height: 320px;
}

.big-stamp {
  position: absolute;
  left: 50%;
  top: 40px;
  translate: -50% 0;
  rotate: -9deg;
  animation: stamp-in 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

@keyframes stamp-in {
  from {
    transform: scale(1.4);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

.postmark {
  position: absolute;
  right: 8px;
  top: 190px;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  border: 3px double color-mix(in srgb, var(--color-brand-text) 60%, transparent);
  rotate: 14deg;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--font-stamp);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--color-brand-text) 72%, transparent);
}

.postmark-small {
  font-size: 0.6875rem;
}

.postmark-day {
  font-size: 1.0625rem;
  margin: 2px 0;
}

.speck {
  position: absolute;
  border-radius: 50%;
}

.first-badge {
  position: absolute;
  left: 4px;
  top: 236px;
  rotate: -5deg;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 10px 12px;
  background: var(--color-surface);
  border-radius: 6px;
  box-shadow: 0 6px 14px rgba(0, 28, 113, 0.16);
}

.first-badge-tape {
  position: absolute;
  left: 30px;
  top: -9px;
  width: 54px;
  height: 18px;
  background: rgba(200, 162, 74, 0.45);
  rotate: -4deg;
}

.first-badge-mark {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--tpl-navy);
  color: #f6d9a8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.75rem;
}

.first-badge-text {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--color-text);
}

.title {
  font-family: var(--font-display);
  font-size: 2.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--color-brand-text);
  font-optical-sizing: auto;
}

.branch-name {
  margin-top: 8px;
  font-size: 1rem;
  color: var(--color-text-mid);
}

.tracker {
  margin-top: 22px;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(20, minmax(0, 1fr));
  gap: 3px;
}

.tracker-cell {
  height: 9px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--color-brand-text) 12%, transparent);
}

.tracker-count {
  margin-top: 8px;
  align-self: flex-end;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--color-brand-text);
}

.btn {
  margin-top: 22px;
  display: block;
  width: 100%;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  text-decoration: none;
  font-size: 1.0625rem;
  font-weight: 700;
  box-shadow: var(--shadow-accent);
}

.link {
  margin-top: 6px;
  padding: 10px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}
</style>
