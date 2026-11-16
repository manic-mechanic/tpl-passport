<template>
  <section class="tour-badges" aria-labelledby="tour-badges-title">
    <div class="tour-badges__head">
      <h2 id="tour-badges-title" class="tour-badges__title">Library Tour</h2>
      <span class="tour-badges__count">{{ routesDone }}/{{ progress.length }} routes</span>
    </div>

    <div class="tour-badges__grid">
      <NuxtLink v-for="p in progress" :key="p.route.id" :to="`/tour/${p.route.id}`" class="tour-badge"
                :aria-label="`Route ${p.route.id}, ${p.route.title}: ${p.visited} of ${p.total} visited`"
      >
        <span class="tour-badge__medal" :class="{ earned: p.complete }"
              :style="p.complete ? { background: p.route.color, color: textOnColor(p.route.color) } : { '--ring': p.route.color }"
        >
          {{ p.route.id }}
        </span>
        <span class="tour-badge__progress">{{ p.complete ? 'Done' : `${p.visited}/${p.total}` }}</span>
      </NuxtLink>
    </div>

    <div class="tour-gold" :class="{ earned: !!goldDay }">
      <span class="tour-gold__medal" aria-hidden="true">100</span>
      <div class="tour-gold__text">
        <p class="tour-gold__title">Go for Gold</p>
        <p class="tour-gold__desc">
          <template v-if="goldDay">Every branch by {{ endLabel }}. Earned {{ formatDay(goldDay) }}.</template>
          <template v-else>Visit all 100 branches by {{ endLabel }}. {{ passport.visitCount }} of 100 so far.</template>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { usePassportStore } from '~/stores/passport'
import { LIBRARY_TOUR, goldEarnedOn, routeProgress, textOnColor, tourRoutes } from '~/lib/libraryTour'

// Next Stop: Your Library Tour badges on the Extra Credit page: one medal per
// route (in its colour once all ten branches are stamped) and Go for Gold.
const passport = usePassportStore()

const progress = computed(() => tourRoutes.map(r => routeProgress(r, passport.visitedBranchCodes)))
const routesDone = computed(() => progress.value.filter(p => p.complete).length)
const goldDay = computed(() => goldEarnedOn(passport.checkIns))

const endLabel = new Date(`${LIBRARY_TOUR.endsOn}T12:00:00`).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })

function formatDay(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.tour-badges {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 18px 8px;
  border-top: 1px solid var(--color-border-soft);
}

.tour-badges__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.tour-badges__title {
  font-size: 1rem;
  color: var(--color-brand-text);
  letter-spacing: 0.04em;
}

.tour-badges__count {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.tour-badges__grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px 8px;
}

.tour-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.tour-badge__medal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  /* Not yet earned: a ring in the route's colour */
  color: var(--color-text-muted);
  background: var(--color-surface);
  box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--ring) 45%, transparent);

  &.earned {
    box-shadow: var(--shadow-sm);
  }
}

.tour-badge__progress {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.tour-gold {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
}

.tour-gold__medal {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg);
  box-shadow: inset 0 0 0 3px color-mix(in srgb, #c9a227 40%, transparent);
}

.tour-gold.earned .tour-gold__medal {
  color: #3d2c00;
  background: radial-gradient(circle at 35% 30%, #f7e08a, #c9a227 70%);
  box-shadow: var(--shadow-sm);
}

.tour-gold__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
}

.tour-gold__desc {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}
</style>
