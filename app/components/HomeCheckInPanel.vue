<template>
  <NuxtLink v-if="variant === 'small'" :to="CHECK_IN_ROUTE" class="checkin-row" @click="emit('tap')">
    <BranchMap class="row-map" lit="all" :zoom="1.15" :dot="1.6" />
    <span class="row-text">
      <span class="row-title">Check in now</span>
      <span class="row-sub">Get a stamp and start filling up your passport.</span>
    </span>
    <IconChevron class="row-chevron" aria-hidden="true" />
  </NuxtLink>

  <section v-else class="checkin-panel" :class="`checkin-panel--${variant}`" aria-labelledby="home-checkin-title">
    <BranchMap class="panel-map" lit="all" :dot="variant === 'large' ? 2.4 : 2" />
    <div class="panel-stamps" aria-hidden="true">
      <div v-for="(s, i) in stamps" :key="s.code" class="panel-stamp" :class="`panel-stamp--${i}`">
        <StampShape :branch-code="s.code" :ward-no="s.ward" :size="s.size" />
      </div>
    </div>
    <div class="panel-text">
      <h2 id="home-checkin-title" class="panel-title">Visiting the library?</h2>
      <p class="panel-sub">Get a stamp. Every branch has a different one.</p>
      <NuxtLink :to="CHECK_IN_ROUTE" class="panel-btn" @click="emit('tap')">Check in now</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { branchesByCode } from '~/composables/useRegion'
import { CHECK_IN_ROUTE, SHOWCASE_STAMPS } from '~/lib/checkInEntry'
import IconChevron from '~/components/icons/IconChevron.vue'

// Home's "Check in" panel for people who haven't checked in yet:
//   large   the top two thirds of a first-visit Home
//   medium  under the passport card, once the passport is made
//   small   the bottom third of a first-visit Home
const props = withDefaults(defineProps<{
  variant?: 'large' | 'medium' | 'small'
}>(), {
  variant: 'large',
})
const emit = defineEmits<{ tap: [] }>()

const stamps = computed(() => {
  const scale = props.variant === 'large' ? 1 : 0.85
  return SHOWCASE_STAMPS.map((code, i) => ({
    code,
    ward: branchesByCode[code]?.WardNo ?? 1,
    // The middle stamp is the big one
    size: Math.round((i === 1 ? 104 : 72) * scale),
  }))
})
</script>

<style scoped>
.checkin-panel {
  --panel-sand: #f6d9a8;
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--tpl-navy);
  box-shadow: 0 10px 24px -10px rgba(0, 28, 113, 0.45);
}

.panel-map {
  flex: 1 1 auto;
  min-height: 120px;
}

.panel-stamps {
  position: relative;
  height: 0;

  /* The stamps sit on the map's lower edge */
  & .panel-stamp {
    position: absolute;
    bottom: -28px;
  }
}

.panel-stamp--0 {
  left: 8%;
  transform: translateY(-6px);
}

.panel-stamp--1 {
  left: 50%;
  translate: -50% 0;
  bottom: -40px !important;
}

.panel-stamp--2 {
  right: 8%;
  transform: translateY(-14px);
}

.panel-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 48px 18px 18px;
}

.panel-title {
  font-family: var(--font-display);
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: #fff;
  font-optical-sizing: auto;
}

.checkin-panel--medium .panel-title {
  font-size: 1.625rem;
}

.panel-sub {
  font-size: 0.9375rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.82);
}

.panel-btn {
  margin-top: 6px;
  display: block;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--panel-sand);
  color: #001c71;
  text-align: center;
  text-decoration: none;
  font-size: 1.0625rem;
  font-weight: 700;
  transition: transform 0.1s;

  &:active {
    transform: scale(0.98);
  }
}

/* Small: one tappable row */
.checkin-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px 14px 14px;
  border-radius: var(--radius-lg);
  background: var(--tpl-navy);
  text-decoration: none;
  box-shadow: 0 10px 24px -10px rgba(0, 28, 113, 0.45);
  transition: transform 0.1s;

  &:active {
    transform: scale(0.98);
  }
}

.row-map {
  flex-shrink: 0;
  width: 120px;
  align-self: stretch;
  min-height: 100px;
  border-radius: var(--radius);
}

.row-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row-title {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.1;
  color: #fff;
  font-optical-sizing: auto;
}

.row-sub {
  font-size: 0.875rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.8);
}

.row-chevron {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: #f6d9a8;
}
</style>
