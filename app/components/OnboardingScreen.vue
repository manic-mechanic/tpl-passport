<template>
  <div v-if="show" class="onboarding" role="dialog" aria-modal="true" aria-label="Welcome">
    <div class="onboarding__top">
      <img src="/tpl-meta-card.png" class="onboarding__logo" alt="" />
      <p class="onboarding__title">passport<span class="onboarding__colon">:</span></p>
      <p class="onboarding__sub">Toronto Public Library</p>
    </div>

    <div class="onboarding__body">
      <h1 class="onboarding__heading">Welcome, collector.</h1>
      <p class="onboarding__desc">Visit all 100 branches and collect a stamp from each one. Set up your passport — or skip and come back to it later.</p>

      <form @submit.prevent="submit" class="onboarding__form">
        <div class="onboarding__field">
          <label class="onboarding__label" for="ob-name">Your name</label>
          <input
            id="ob-name"
            v-model="nameInput"
            class="onboarding__input"
            type="text"
            placeholder="Optional"
            maxlength="40"
            autocomplete="given-name"
            autofocus
          />
        </div>

        <div class="onboarding__field">
          <label class="onboarding__label" for="ob-branch">Home branch</label>
          <select id="ob-branch" v-model="homeBranchInput" class="onboarding__input onboarding__select">
            <option value="">Optional</option>
            <option v-for="b in sortedBranches" :key="b.BranchCode" :value="b.BranchCode">
              {{ b.BranchName }}
            </option>
          </select>
        </div>

        <div class="onboarding__field">
          <label class="onboarding__label" for="ob-book">Favourite book</label>
          <input
            id="ob-book"
            v-model="bookInput"
            class="onboarding__input"
            type="text"
            placeholder="Optional"
            maxlength="80"
            autocomplete="off"
          />
        </div>

        <button type="submit" class="onboarding__btn">Start my passport</button>
      </form>

      <button class="onboarding__skip" @click="skip">Skip for now</button>
    </div>

    <div class="onboarding__band onboarding__band--bottom" />
  </div>
</template>

<script setup>
import { physicalBranches } from '~/composables/useRegion'

defineProps({ show: Boolean })
const emit = defineEmits(['done'])

const passport = usePassportStore()

const nameInput       = ref('')
const homeBranchInput = ref('')
const bookInput       = ref('')

const sortedBranches = [...physicalBranches].sort((a, b) => a.BranchName.localeCompare(b.BranchName))

function submit() {
  if (nameInput.value.trim())       passport.profile.name         = nameInput.value.trim()
  if (homeBranchInput.value)        passport.profile.homeBranch   = homeBranchInput.value
  if (bookInput.value.trim())       passport.profile.favouriteBook = bookInput.value.trim()
  passport.profile.hasSeenOnboarding = true
  emit('done')
}

function skip() {
  passport.profile.hasSeenOnboarding = true
  emit('done')
}
</script>

<style scoped>
.onboarding {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 100%;
  max-width: 480px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 998;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  animation: onboarding-in 0.35s ease both;
  overflow-y: auto;
}

@keyframes onboarding-in {
  from { opacity: 0; transform: translateX(-50%) translateY(16px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.onboarding__top {
  background: var(--tpl-navy);
  padding: 48px 32px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.onboarding__logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
  border-radius: 12px;
  filter: brightness(10);
  opacity: 0.9;
}

.onboarding__title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1;
}

.onboarding__colon { color: var(--tpl-blue); }

.onboarding__sub {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.onboarding__body {
  flex: 1;
  padding: 36px 28px 24px;
  display: flex;
  flex-direction: column;
}

.onboarding__heading {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-brand-text);
  letter-spacing: -0.02em;
  margin-bottom: 10px;
}

.onboarding__desc {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 28px;
}

.onboarding__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.onboarding__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.onboarding__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.onboarding__input {
  width: 100%;
  padding: 14px 16px;
  font-size: 1rem;
  font-family: var(--font-body);
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-text);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
}

.onboarding__input:focus {
  border-color: var(--tpl-blue);
}

.onboarding__select {
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.onboarding__btn {
  width: 100%;
  padding: 15px;
  font-size: 1rem;
  font-weight: 600;
  font-family: var(--font-body);
  background: var(--tpl-blue);
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  margin-top: 4px;
  transition: opacity 0.15s;
}

.onboarding__skip {
  margin-top: 16px;
  align-self: center;
  background: none;
  border: none;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.onboarding__band--bottom {
  height: 6px;
  background: linear-gradient(90deg, var(--tpl-blue) 0%, var(--tpl-teal) 50%, var(--tpl-blue) 100%);
  opacity: 0.6;
  flex-shrink: 0;
}
</style>
