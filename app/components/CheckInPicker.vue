<template>
  <div class="picker">
    <div class="picker-map-wrap">
      <BranchMap class="picker-map" :focus="selected?.BranchCode" :here="selected?.BranchCode"
                 :lit="selected ? [selected.BranchCode] : []" :zoom="selected ? 3.4 : 1" :dot="3"
      />
      <!-- The selected branch's stamp rises over its dot (the map's centre) -->
      <Transition name="rise" mode="out-in">
        <div v-if="selected" :key="selected.BranchCode" class="picker-map-stamp" aria-hidden="true">
          <StampShape :branch-code="selected.BranchCode" :ward-no="selected.WardNo" :size="88" />
        </div>
      </Transition>
    </div>

    <div class="picker-sheet">
      <div v-if="searchOpen" class="picker-search">
        <label class="picker-label" for="picker-search-input">Search branches</label>
        <input id="picker-search-input" ref="searchInput" v-model="query" type="search" class="picker-input" autocomplete="off" />
      </div>

      <div class="picker-list" role="radiogroup" aria-label="Branch">
        <label v-for="b in shown" :key="b.BranchCode" class="picker-row" :class="{ 'picker-row--on': b.BranchCode === code }">
          <span class="picker-row-stamp" :class="{ 'picker-row-stamp--ghost': b.BranchCode !== code }">
            <StampShape :branch-code="b.BranchCode" :ward-no="b.WardNo" :size="40" />
          </span>
          <span class="picker-row-name">{{ b.BranchName }}</span>
          <span v-if="b.km != null" class="picker-row-dist">{{ formatDist(b.km) }}</span>
          <input v-model="code" type="radio" name="checkin-branch" :value="b.BranchCode" :aria-label="b.BranchName" class="picker-radio" />
        </label>
        <p v-if="!shown.length" class="picker-none">No branches match “{{ query }}”.</p>
      </div>

      <div class="picker-date" role="group" aria-label="Visit date">
        <button type="button" class="date-step" aria-label="Previous day" @click="day = shiftDay(day, -1)">
          <IconBack aria-hidden="true" />
        </button>
        <label class="date-pick">
          <IconCalendar class="date-icon" aria-hidden="true" />
          <span>{{ dayLabel(day) }}</span>
          <input type="date" class="date-input" aria-label="Choose a date" :value="day" :max="today" :min="EARLIEST"
                 @change="onDateInput"
          />
        </label>
        <button type="button" class="date-step" aria-label="Next day" :disabled="day >= today" @click="day = shiftDay(day, 1)">
          <IconChevron aria-hidden="true" />
        </button>
      </div>

      <p v-if="selected && visitedThatDay" class="picker-notice" role="status">
        You already have a {{ selected.BranchName }} stamp for this day.
      </p>

      <button type="button" class="picker-btn" :disabled="!selected || visitedThatDay" @click="stamp">
        Stamp my passport
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDist, haversineKm, sortedBranches, branchesByCode } from '~/composables/useRegion'
import { usePassportStore } from '~/stores/passport'
import { branchSearchMatcher } from '~/lib/branchSearch'
import { clampDay, dayLabel, shiftDay, todayKey } from '~/lib/checkInDate'
import type { Coords } from '~/lib/geolocation'
import IconBack from '~/components/icons/IconBack.vue'
import IconCalendar from '~/components/icons/IconCalendar.vue'
import IconChevron from '~/components/icons/IconChevron.vue'

// "Pick another branch": for when you're not at a branch, or location is
// off. Any branch, any day up to today. No location check; the one stamp
// per branch per day rule still applies.

const props = defineProps<{
  // Pre-selected: the nearest branch, else the home branch
  initialCode?: string
  position?: Coords | null
}>()
const emit = defineEmits<{ stamp: [payload: { code: string, day: string }] }>()

const EARLIEST = '2015-01-01'

const passport = usePassportStore()
const today = todayKey()
const code = ref(props.initialCode && branchesByCode[props.initialCode] ? props.initialCode : '')
const day = ref(today)
const query = ref('')
const searchOpen = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)

const selected = computed(() => (code.value ? branchesByCode[code.value] : undefined) ?? null)
const visitedThatDay = computed(() => !!selected.value && passport.hasVisitedOn(selected.value.BranchCode, day.value))

// Nearest first when we know where you are, else A to Z. The selected
// branch stays at the top so it's in view.
const ordered = computed(() => {
  const pos = props.position
  const list = sortedBranches.map(b => ({
    ...b,
    km: pos ? haversineKm(pos.latitude, pos.longitude, b.Lat, b.Long) : null,
  }))
  if (pos) list.sort((a, b) => a.km! - b.km!)
  return list
})

const initial = code.value
const shown = computed(() => {
  const match = branchSearchMatcher(query.value)
  const list = ordered.value.filter(match)
  if (query.value) return list
  const first = list.findIndex(b => b.BranchCode === initial)
  return first > 0 ? [list[first]!, ...list.slice(0, first), ...list.slice(first + 1)] : list
})

async function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) {
    query.value = ''
    return
  }
  await nextTick()
  searchInput.value?.focus()
}

function onDateInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  day.value = clampDay(value || today, new Date(), EARLIEST)
}

// Search sits in the page banner, which opens and closes it.
defineExpose({ toggleSearch, searchOpen })

function stamp() {
  if (!selected.value || visitedThatDay.value) return
  emit('stamp', { code: selected.value.BranchCode, day: day.value })
}
</script>

<style scoped>
.picker {
  /* Fills the screen under the banner; only the branch list scrolls */
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: -20px -18px -16px;
}

.picker-map-wrap {
  position: relative;
  flex-shrink: 0;
  height: clamp(130px, 24svh, 240px);
}

.picker-map {
  position: absolute;
  inset: 0;
}

.picker-map-stamp {
  position: absolute;
  left: 50%;
  bottom: 50%;
  translate: -50% 4px;
  padding: 8px;
  filter: drop-shadow(0 14px 18px rgba(0, 28, 113, 0.3));
}

.rise-enter-active,
.rise-leave-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.rise-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.rise-leave-to {
  opacity: 0;
}

.picker-sheet {
  position: relative;
  flex: 1;
  min-height: 0;
  margin-top: -24px;
  padding: 18px 18px 0;
  border-radius: 22px 22px 0 0;
  background: var(--color-bg);
  box-shadow: 0 -10px 30px -12px rgba(0, 28, 113, 0.3);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.picker-search {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.picker-label {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-mid);
}

.picker-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font: 1rem var(--font-body);
  outline: none;

  &:focus {
    border-color: var(--tpl-blue);
  }
}

.picker-list {
  flex: 1;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px;
  margin: -2px;
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 60px;
  padding: 0 14px 0 4px;
  border-radius: var(--radius);
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  cursor: pointer;
}

.picker-row--on {
  border: 2px solid var(--tpl-blue);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--tpl-blue) 18%, transparent);
}

.picker-row-stamp {
  flex-shrink: 0;
  width: 52px;
  display: flex;
  justify-content: center;
  transition: opacity 0.15s ease-out, filter 0.15s ease-out;
}

.picker-row-stamp--ghost {
  opacity: 0.28;
  filter: grayscale(1);
}

.picker-row-name {
  flex: 1;
  font-weight: 600;
  font-size: 1rem;
}

.picker-row--on .picker-row-name {
  font-weight: 700;
}

.picker-row-dist {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-right: 8px;
}

.picker-radio {
  width: 20px;
  height: 20px;
  accent-color: var(--tpl-blue);
}

.picker-none {
  padding: 12px 4px;
  font-size: 0.9375rem;
  color: var(--color-text-mid);
}

.picker-date {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: var(--radius);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.date-step {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: none;
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  & svg {
    width: 20px;
    height: 20px;
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
}

.date-pick {
  position: relative;
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
  background: var(--color-bg);
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
  cursor: pointer;
}

.date-icon {
  width: 18px;
  height: 18px;
  color: var(--color-text-mid);
}

/* The native date picker, invisible over the label so a tap opens it */
.date-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.picker-notice {
  font-size: 0.875rem;
  color: var(--color-text-mid);
  text-align: center;
}

.picker-btn {
  margin-bottom: 16px;
  width: 100%;
  padding: 16px;
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius);
  font: 700 1.0625rem var(--font-body);
  cursor: pointer;
  box-shadow: var(--shadow-accent);
  transition: transform 0.1s;

  &:disabled {
    background: var(--color-text-muted);
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:not(:disabled):active {
    transform: scale(0.98);
  }
}
</style>
