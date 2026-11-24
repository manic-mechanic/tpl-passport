<template>
  <main class="page-content make-passport">
    <div class="band" aria-hidden="true" />

    <div class="head">
      <h1 class="title">Your passport</h1>
      <button type="button" class="close" aria-label="Close" @click="close">
        <IconClose aria-hidden="true" />
      </button>
    </div>

    <form class="form" @submit.prevent="save">
      <div class="field">
        <label class="field-label" for="make-passport-name">Name</label>
        <input id="make-passport-name" v-model="name" class="field-input" type="text" maxlength="40"
               autocomplete="given-name" required
        />
      </div>
      <div class="field">
        <label class="field-label" for="make-passport-home">Home branch</label>
        <BranchCombobox id="make-passport-home" v-model="homeBranch" />
      </div>

      <button type="submit" class="save" :disabled="!name.trim() || saving">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </form>
  </main>
</template>

<script setup lang="ts">
import { usePassportStore } from '~/stores/passport'
import { useSignedIn } from '~/composables/useAuthState'
import { pushProfile } from '~/composables/useProfileSync'
import IconClose from '~/components/icons/IconClose.vue'

// "Make your passport": a name and a home branch. The photo or avatar
// comes with the avatar builder (#83, PR 2).

const { $posthog } = useNuxtApp()
const passport = usePassportStore()
const signedIn = useSignedIn()

const name = ref(passport.profile.name ?? '')
const homeBranch = ref(passport.profile.homeBranch ?? '')
const saving = ref(false)

function close() {
  navigateTo('/')
}

async function save() {
  const trimmed = name.value.trim()
  if (!trimmed || saving.value) return
  saving.value = true
  passport.profile.name = trimmed
  passport.profile.homeBranch = homeBranch.value
  if (signedIn.value) await pushProfile({ name: trimmed, homeBranch: homeBranch.value || null })
  $posthog?.capture('passport_made', {
    picture: 'none',
    home_branch_set: !!homeBranch.value,
    checked_in: passport.checkIns.length > 0,
  })
  saving.value = false
  // Signed out: offer an account next, so the passport isn't only on this device.
  await navigateTo(signedIn.value ? '/' : '/save-progress')
}
</script>

<style scoped>
.make-passport {
  display: flex;
  flex-direction: column;
}

.band {
  margin: 0 -18px;
  height: 14px;
  background: var(--tpl-navy);
  border-bottom: 3px solid #c8a24a;
}

.head {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--color-brand-text);
  font-optical-sizing: auto;
}

.close {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: var(--color-sheet-close);
  color: var(--color-text-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:active {
    background: var(--color-sheet-close-active);
  }

  & svg {
    width: 16px;
    height: 16px;
  }
}

.form {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-mid);
}

.field-input {
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

.save {
  margin-top: 4px;
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: var(--radius);
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  font: 700 1.0625rem var(--font-body);
  box-shadow: var(--shadow-accent);
  cursor: pointer;
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
