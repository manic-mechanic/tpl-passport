<template>
  <div class="scene" :class="`scene--${view}`" aria-hidden="true">
    <BranchMap v-if="view === 'map'" class="scene-map" :focus="branch.BranchCode" :here="branch.BranchCode"
               :lit="nearby" :zoom="6" :dot="5"
    />

    <template v-else-if="view === 'diary'">
      <p class="diary-date">{{ today }}</p>
      <div class="diary-photo">
        <BranchFacade :branch-code="branch.BranchCode" :ward-no="branch.WardNo" :width="220" />
        <p class="diary-caption">{{ lastVisit ? `Last visit: ${lastVisit}` : 'First visit' }}</p>
        <span class="diary-tape" />
      </div>
      <svg class="diary-star" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4"
           stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M20 4l4.5 10 11 1-8.4 7.2 2.6 10.8L20 27.4 10.3 33l2.6-10.8L4.5 15l11-1z" />
      </svg>
    </template>

    <template v-else>
      <div class="street-road" />
      <div class="street-building">
        <BranchFacade :branch-code="branch.BranchCode" :ward-no="branch.WardNo" :width="480" />
      </div>
      <div class="street-people street-people--left">
        <AvatarSticker :kind="3" skin="#8d5a3b" hair="#1d140f" bg="transparent" shirt="#c94a32" accent="#7a3ec4" :size="68" :radius="0" />
        <AvatarSticker :kind="2" skin="#f1c7a5" hair="#a2582b" bg="transparent" shirt="#005fc0" accent="#ffd76a" :size="56" :radius="0" />
      </div>
      <div class="street-people street-people--right">
        <AvatarSticker :kind="5" skin="#5c3a26" hair="#151010" bg="transparent" shirt="#5f9e57" :size="72" :radius="0" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import { haversineKm, physicalBranches } from '~/composables/useRegion'
import type { CheckInView } from '~/lib/checkInView'

// The picture above the branch card on the check-in page: the branch on the
// city map, a diary page, or the branch on its street. Decorative; the card
// below names the branch.

const props = defineProps<{
  view: CheckInView
  branch: Branch
  // "Oct 12" when the person has been here before
  lastVisit?: string
}>()

// The branch and its three nearest neighbours, in colour on the map
const nearby = computed(() => {
  const { Lat, Long } = props.branch
  return physicalBranches
    .map(b => ({ code: b.BranchCode, km: haversineKm(Lat, Long, b.Lat, b.Long) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 4)
    .map(b => b.code)
})

const today = new Date().toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).replace(/\./g, '')
</script>

<style scoped>
.scene {
  position: relative;
  overflow: hidden;
}

.scene-map {
  position: absolute;
  inset: 0;
}

/* Diary: a dotted notebook page with a taped photo */
.scene--diary {
  background-color: var(--color-paper);
  background-image: radial-gradient(color-mix(in srgb, var(--tpl-navy) 15%, transparent) 1px, transparent 1.2px);
  background-size: 16px 16px;
}

.diary-date {
  position: absolute;
  left: 24px;
  top: 16px;
  font-family: var(--font-stamp-elite);
  font-size: 1.5rem;
  color: var(--color-brand-text);
}

.diary-photo {
  position: absolute;
  left: 34px;
  top: 64px;
  padding: 9px 9px 40px;
  background: #fff;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
  transform: rotate(-4deg);
}

.diary-caption {
  position: absolute;
  left: 12px;
  bottom: 10px;
  font-family: var(--font-stamp-elite);
  font-size: 1rem;
  color: #333;
}

.diary-tape {
  position: absolute;
  left: 84px;
  top: -12px;
  width: 80px;
  height: 22px;
  background: rgba(200, 162, 74, 0.5);
  transform: rotate(2deg);
}

.diary-star {
  position: absolute;
  right: 30px;
  top: 64px;
  width: 40px;
  height: 40px;
  color: #c8a24a;
}

/* Street: the branch with people outside */
.scene--street {
  background: #c9dff0;
}

.street-road {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--scene-cover, 0px);
  background: #d9d2c3;
}

/* Standing on the part of the scene the card doesn't cover */
.street-building {
  position: absolute;
  left: 50%;
  bottom: calc(var(--scene-cover, 0px) - 2px);
  translate: -50% 0;
}

.street-people {
  position: absolute;
  bottom: calc(var(--scene-cover, 0px) + 24px);
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.street-people--left {
  left: 14px;
}

.street-people--right {
  right: 14px;
}
</style>
