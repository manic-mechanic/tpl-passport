<template>
  <main class="page-content">
    <header class="page-header">
      <h1>Settings</h1>
    </header>
    <div class="header-gap" />

    <!-- Account -->
    <section class="settings-group">
      <p class="section-label">Account</p>
      <div class="settings-card card">
        <template v-if="session">
          <div class="setting-row">
            <span class="setting-label">Signed in as</span>
            <span class="account-email">{{ session.user.email }}</span>
          </div>

          <!-- Change email -->
          <div class="setting-row setting-row-action" @click="toggleChangeEmail">
            <span class="setting-label">Change email</span>
            <span class="setting-chevron" :class="{ open: showChangeEmail }">›</span>
          </div>
          <div v-if="showChangeEmail" class="inline-form">
            <input v-model="newEmail" class="inline-input" type="email" placeholder="New email address"
                   autocomplete="email" autocapitalize="none"
            />
            <p v-if="emailError" class="inline-error">{{ emailError }}</p>
            <div class="inline-actions">
              <button class="inline-cancel" @click="cancelChangeEmail">Cancel</button>
              <button class="inline-save" :disabled="emailSaving" @click="submitChangeEmail">
                {{ emailSaving ? 'Saving…' : 'Update' }}
              </button>
            </div>
          </div>

          <!-- Change password -->
          <div class="setting-row setting-row-action" @click="toggleChangePassword">
            <span class="setting-label">Change password</span>
            <span class="setting-chevron" :class="{ open: showChangePassword }">›</span>
          </div>
          <div v-if="showChangePassword" class="inline-form">
            <input v-model="currentPassword" class="inline-input" type="password" placeholder="Current password"
                   autocomplete="current-password"
            />
            <input v-model="newPassword" class="inline-input" type="password" placeholder="New password"
                   autocomplete="new-password"
            />
            <input v-model="confirmPassword" class="inline-input" type="password" placeholder="Confirm new password"
                   autocomplete="new-password"
            />
            <p v-if="passwordError" class="inline-error">{{ passwordError }}</p>
            <div class="inline-actions">
              <button class="inline-cancel" @click="cancelChangePassword">Cancel</button>
              <button class="inline-save" :disabled="passwordSaving" @click="submitChangePassword">
                {{ passwordSaving ? 'Saving…' : 'Update' }}
              </button>
            </div>
          </div>

          <div class="setting-row">
            <button class="signout-btn" @click="signOut">Sign out</button>
          </div>
        </template>
        <div v-else class="setting-row">
          <div>
            <span class="setting-label">Save your progress</span>
            <p class="setting-hint">Access your passport on any device</p>
          </div>
          <NuxtLink to="/login" class="signin-link">Sign in →</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Profile -->
    <section class="settings-group">
      <p class="section-label">Profile</p>
      <div class="settings-card card">
        <div class="setting-row">
          <label class="setting-label" for="profile-name">Name</label>
          <input id="profile-name" v-model="profileName" class="profile-input" type="text"
                 placeholder="Your name" maxlength="40" autocomplete="given-name"
          />
        </div>
        <div class="setting-row">
          <span class="setting-label">Home Branch</span>
          <div class="profile-branch-wrap">
            <BranchCombobox v-model="profileHomeBranch" placeholder="Search branches…" />
          </div>
        </div>
        <div class="setting-row">
          <button class="profile-save-btn" :disabled="profileSaving" @click="saveProfile">
            {{ profileSaving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Appearance -->
    <section class="settings-group">
      <p class="section-label">Appearance</p>
      <div class="settings-card card">
        <div class="setting-row">
          <span class="setting-label">Theme</span>
          <div class="theme-toggle">
            <button
              class="theme-btn"
              :class="{ active: passport.profile.theme === 'light' }"
              @click="passport.profile.theme = 'light'"
            >
              Light
            </button>
            <button
              class="theme-btn"
              :class="{ active: passport.profile.theme === '' }"
              @click="passport.profile.theme = ''"
            >
              Auto
            </button>
            <button
              class="theme-btn"
              :class="{ active: passport.profile.theme === 'dark' }"
              @click="passport.profile.theme = 'dark'"
            >
              Dark
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Demo mode — dev only -->
    <section v-if="isDev" class="settings-group">
      <p class="section-label">Demo mode</p>
      <div class="demo-grid">
        <button
          v-for="mode in demoModes"
          :key="mode.value"
          class="demo-btn"
          :class="{ active: activeDemoMode === mode.value }"
          @click="setDemo(mode.value)"
        >
          <span class="demo-icon">{{ mode.icon }}</span>
          <span class="demo-label">{{ mode.label }}</span>
          <span class="demo-count">{{ mode.count }}</span>
        </button>
      </div>
    </section>

    <!-- Developer — dev only -->
    <section v-if="isDev" class="settings-group">
      <p class="section-label">Developer</p>
      <div class="settings-card card">
        <div class="setting-row">
          <div>
            <span class="setting-label">Location check</span>
            <p class="setting-hint">Require being near the branch to check in.</p>
          </div>
          <div class="theme-toggle">
            <button
              class="theme-btn"
              :class="{ active: !passport.profile.bypassLocationFence }"
              @click="passport.profile.bypassLocationFence = false"
            >
              On
            </button>
            <button
              class="theme-btn"
              :class="{ active: passport.profile.bypassLocationFence }"
              @click="passport.profile.bypassLocationFence = true"
            >
              Off
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- About -->
    <section class="settings-group">
      <p class="section-label">About</p>
      <div class="about-card card">
        <div class="about-row">
          <span class="setting-label">Version</span>
          <span class="about-val">1.0 MVP</span>
        </div>
        <div class="about-row link">
          <a href="https://tpl.ca" target="_blank" class="about-link">Toronto Public Library ↗</a>
        </div>
        <div class="about-row">
          <p class="disclaimer">This is an unofficial app and is not affiliated with or endorsed by Toronto Public Library.</p>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import * as Sentry from '@sentry/nuxt'
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'
import { authClient } from '~/lib/auth-client'
import { pushProfile } from '~/composables/useProfileSync'

const { $posthog } = useNuxtApp()
const passport = usePassportStore()
const { public: { isDev } } = useRuntimeConfig()

watch(() => passport.profile.theme, (theme) => {
  $posthog?.capture('theme_changed', { theme: theme || 'system' })
})

const session = ref(null)

onMounted(async () => {
  const { data } = await authClient.getSession()
  session.value = data
})

// Profile editing
const profileName = ref(passport.profile.name ?? '')
const profileHomeBranch = ref(passport.profile.homeBranch ?? '')
const profileSaving = ref(false)

async function saveProfile() {
  profileSaving.value = true
  try {
    passport.profile.name = profileName.value
    passport.profile.homeBranch = profileHomeBranch.value
    await pushProfile({ name: profileName.value, homeBranch: profileHomeBranch.value || null })
    $posthog?.capture('profile_updated')
  } finally {
    profileSaving.value = false
  }
}

async function signOut() {
  await authClient.signOut()
  $posthog?.capture('signed_out')
  $posthog?.reset()
  Sentry.setUser(null)
  session.value = null
}

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
  if (trimmed === session.value?.user?.email) { emailError.value = 'That is already your current email.'; return }
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
    }
  } finally {
    passwordSaving.value = false
  }
}

// Demo mode
const demoModes = [
  { value: 'empty',     label: 'Empty',    icon: '📖', count: '0 stamps' },
  { value: 'mid',       label: 'Mid-way',  icon: '🗺️', count: '28 stamps' },
  { value: 'completed', label: 'Complete', icon: '🏆', count: `${physicalBranches.length} stamps` },
]

const activeDemoMode = ref('empty')

function setDemo(mode) {
  activeDemoMode.value = mode
  passport.loadDemoState(mode)
  $posthog?.capture('demo_mode_activated', { demo_state: mode })
}
</script>

<style scoped>
.page-header {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 10;
  margin: 0 -18px;
  padding: 14px 18px 16px;
  background: var(--tpl-navy);
}

.header-gap {
  height: 20px;
}

.page-header h1 {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
}

.settings-group {
  margin-bottom: 24px;
}

/* ── Profile ──────────────────────────────────── */
.profile-input {
  font-size: 0.875rem;
  font-family: var(--font-body);
  color: var(--color-text);
  background: none;
  border: none;
  outline: none;
  text-align: right;
  width: 55%;
  padding: 0;
}

.profile-input::placeholder { color: var(--color-text-muted); }

.profile-branch-wrap {
  width: 55%;
  text-align: right;

  :deep(.combo-input) {
    text-align: right;
    font-size: 0.875rem;
    color: var(--color-text);
    background: transparent;
    border: none;
    outline: none;
    width: 100%;
  }
}

.profile-save-btn {
  font-size: 0.875rem;
  font-weight: 700;
  font-family: var(--font-body);
  color: var(--tpl-blue);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* ── Account — inline forms ───────────────────── */
.setting-row-action {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active { opacity: 0.7; }
}

.setting-chevron {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  transition: transform 0.15s;
  display: inline-block;

  &.open { transform: rotate(90deg); }
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
  font-size: 0.875rem;
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
  color: #fff;
  background: var(--tpl-blue);
  border: none;
  border-radius: var(--radius-sm);
  padding: 10px;
  cursor: pointer;

  &:disabled { opacity: 0.55; cursor: not-allowed; }
}

/* ── Account ──────────────────────────────────── */
.account-email {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 55%;
  text-align: right;
}

.signin-link {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tpl-blue);
}

.signout-btn {
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

/* ── Shared settings card ─────────────────────── */
.settings-card {
  overflow: hidden;
}

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

.setting-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 2px;
  line-height: 1.4;
}

/* Theme toggle */
.theme-toggle {
  display: flex;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 3px;
  gap: 2px;
}

.theme-btn {
  flex: 1;
  padding: 5px 12px;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &.active {
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
  }
}

/* Demo */
.demo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.demo-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 14px 8px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  box-shadow: var(--shadow-sm);

  &.active {
    border-color: var(--tpl-blue);
    background: color-mix(in srgb, var(--tpl-blue) 8%, var(--color-surface));

    & .demo-label { color: var(--tpl-blue); }
  }
}

.demo-icon { font-size: 1.25rem; }

.demo-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text);
}

.demo-count {
  font-size: 0.625rem;
  color: var(--color-text-muted);
}

/* About */
.about-card { overflow: hidden; }

.about-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  border-bottom: 1px solid var(--color-border-soft);
  font-size: 0.875rem;

  &:last-child { border-bottom: none; }
  &.link { justify-content: flex-start; }
}

.about-val { color: var(--color-text-muted); }

.about-link {
  color: var(--tpl-blue);
  font-weight: 600;
  font-size: 0.875rem;
}

.disclaimer {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}
</style>
