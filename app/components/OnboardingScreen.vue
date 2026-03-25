<template>
  <div v-if="show" class="onboarding" role="dialog" aria-modal="true" aria-label="Welcome">
    <div class="onboarding__top">
      <img src="/tpl-meta-card.png" class="onboarding__logo" alt="" />
      <p class="onboarding__title">passport<span class="onboarding__colon">:</span></p>
      <p class="onboarding__sub">Toronto Public Library</p>
    </div>

    <div class="onboarding__body">
      <h1 class="onboarding__heading">Welcome, collector.</h1>
      <p class="onboarding__desc">Visit all 100 branches and collect a stamp from each one. What name should go on your passport?</p>

      <form @submit.prevent="submit" class="onboarding__form">
        <input
          v-model="nameInput"
          class="onboarding__input"
          type="text"
          placeholder="Your name"
          maxlength="40"
          autocomplete="given-name"
          autofocus
        />
        <button type="submit" class="onboarding__btn" :disabled="!nameInput.trim()">
          Start my passport
        </button>
      </form>

      <button class="onboarding__skip" @click="skip">Skip for now</button>
    </div>

    <div class="onboarding__band onboarding__band--bottom" />
  </div>
</template>

<script setup>
const props = defineProps({ show: Boolean })
const emit = defineEmits(['done'])

const passport = usePassportStore()
const nameInput = ref('')

function submit() {
  const trimmed = nameInput.value.trim()
  if (!trimmed) return
  passport.profile.name = trimmed
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
  gap: 12px;
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
  transition: opacity 0.15s;
}

.onboarding__btn:disabled {
  opacity: 0.4;
  cursor: default;
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
}
</style>
