<template>
  <div class="setting-row">
    <span class="setting-label">Email</span>
    <button class="inline-open" @click="toggleChangeEmail">
      {{ showChangeEmail ? 'Close' : 'Change email' }}
    </button>
  </div>
  <div v-if="showChangeEmail" class="inline-form">
    <input v-model="newEmail" class="inline-input" type="email" placeholder="New email address"
           autocomplete="email" autocapitalize="none"
    >
    <p v-if="emailError" class="inline-error">{{ emailError }}</p>
    <div class="inline-actions">
      <button class="inline-cancel" @click="cancelChangeEmail">Cancel</button>
      <button class="inline-save" :disabled="emailSaving" @click="submitChangeEmail">
        {{ emailSaving ? 'Saving…' : 'Update' }}
      </button>
    </div>
  </div>

  <div class="setting-row">
    <span class="setting-label">Password</span>
    <button class="inline-open" @click="toggleChangePassword">
      {{ showChangePassword ? 'Close' : 'Change password' }}
    </button>
  </div>
  <div v-if="showChangePassword" class="inline-form">
    <input v-model="currentPassword" class="inline-input" type="password" placeholder="Current password"
           autocomplete="current-password"
    >
    <input v-model="newPassword" class="inline-input" type="password" placeholder="New password"
           autocomplete="new-password"
    >
    <input v-model="confirmPassword" class="inline-input" type="password" placeholder="Confirm new password"
           autocomplete="new-password"
    >
    <p v-if="passwordError" class="inline-error">{{ passwordError }}</p>
    <div class="inline-actions">
      <button class="inline-cancel" @click="cancelChangePassword">Cancel</button>
      <button class="inline-save" :disabled="passwordSaving" @click="submitChangePassword">
        {{ passwordSaving ? 'Saving…' : 'Update' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { authClient } from '~/lib/auth-client'

// Change-email and change-password rows for email/password accounts.
// Emits `toast` with a success message for the settings page to show.
const props = defineProps({
  currentEmail: { type: String, default: '' },
})
const emit = defineEmits(['toast'])

const { $posthog } = useNuxtApp()

// Change email
const showChangeEmail = ref(false)
const newEmail = ref('')
const emailError = ref('')
const emailSaving = ref(false)

function toggleChangeEmail() {
  showChangeEmail.value = !showChangeEmail.value
  newEmail.value = ''
  emailError.value = ''
}

function cancelChangeEmail() {
  showChangeEmail.value = false
  newEmail.value = ''
  emailError.value = ''
}

async function submitChangeEmail() {
  const trimmed = newEmail.value.trim()
  if (!trimmed) { emailError.value = 'Enter a new email address.'; return }
  if (trimmed === props.currentEmail) { emailError.value = 'That is already your current email.'; return }
  emailError.value = ''
  emailSaving.value = true
  try {
    const { error } = await authClient.changeEmail({ newEmail: trimmed })
    if (error) {
      emailError.value = error.message ?? 'Something went wrong.'
    } else {
      showChangeEmail.value = false
      newEmail.value = ''
      $posthog?.capture('email_changed')
      emit('toast', 'Email updated.')
    }
  } finally {
    emailSaving.value = false
  }
}

// Change password
const showChangePassword = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordSaving = ref(false)

function toggleChangePassword() {
  showChangePassword.value = !showChangePassword.value
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
}

function cancelChangePassword() {
  showChangePassword.value = false
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
}

async function submitChangePassword() {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'All fields are required.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'New passwords do not match.'
    return
  }
  if (newPassword.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters.'
    return
  }
  passwordError.value = ''
  passwordSaving.value = true
  try {
    const { error } = await authClient.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    if (error) {
      passwordError.value =
        error.code === 'CREDENTIAL_ACCOUNT_NOT_FOUND'
          ? 'No password on this account (signed in with Google).'
          : error.code === 'INVALID_PASSWORD'
            ? 'Current password is incorrect.'
            : (error.message ?? 'Something went wrong.')
    } else {
      $posthog?.capture('password_changed')
      showChangePassword.value = false
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      emit('toast', 'Password updated.')
    }
  } finally {
    passwordSaving.value = false
  }
}
</script>

<style scoped>
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-soft);

  &:last-child { border-bottom: none; }
}

.setting-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.inline-open {
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--tpl-blue);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.inline-form {
  padding: 12px 16px 14px;
  border-bottom: 1px solid var(--color-border-soft);
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--color-bg);
}

.inline-input {
  width: 100%;
  font-size: 1rem;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: var(--tpl-blue); }
  &::placeholder { color: var(--color-text-muted); }
}

.inline-error {
  font-size: 0.75rem;
  color: #c0392b;
  margin: 0;
  line-height: 1.4;
}

.inline-actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.inline-cancel {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px;
  cursor: pointer;
}

.inline-save {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-inverse);
  background: var(--tpl-blue);
  border: none;
  border-radius: var(--radius-sm);
  padding: 10px;
  cursor: pointer;

  &:disabled { opacity: 0.55; cursor: not-allowed; }
}
</style>
