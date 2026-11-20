<template>
  <main class="page-content">
    <PageBanner title="Settings" />
    <p v-if="inlineToast.text" class="inline-toast" :class="inlineToast.kind">{{ inlineToast.text }}</p>

    <!-- Account -->
    <section class="settings-group">
      <p class="section-label">Account</p>
      <div class="settings-card card">
        <template v-if="isSignedIn">
          <div class="setting-row">
            <span class="setting-label">Signed in as</span>
            <span class="account-email">{{ account?.email ?? '…' }}</span>
          </div>

          <SettingsCredentialForms
            v-if="showCredentialForms && account"
            :current-email="account.email"
            :disabled="!authKnown"
            @toast="showToast"
          />
          <p v-else-if="account?.isGoogle" class="provider-note">Signed in with Google. Google manages your email and password.</p>

          <div class="setting-row">
            <div>
              <button class="signout-btn" :disabled="signingOut || !authKnown" @click="signOut">
                {{ signingOut ? 'Syncing…' : 'Sign out' }}
              </button>
              <p class="setting-hint">Your passport stays in your account and is removed from this device.</p>
            </div>
          </div>
        </template>
        <div v-else-if="authSettled" class="setting-row">
          <div>
            <span class="setting-label">Save your progress</span>
            <p class="setting-hint">Access your passport on any device</p>
          </div>
          <NuxtLink to="/login" class="signin-link">Sign in</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Profile -->
    <section class="settings-group">
      <p class="section-label">Profile</p>
      <div class="settings-card card">
        <template v-if="isSignedIn && !profileEditing">
          <div class="setting-row">
            <span class="setting-label">Name</span>
            <span class="account-email">{{ profileName || '—' }}</span>
          </div>
          <div class="setting-row">
            <span class="setting-label">Home branch</span>
            <span class="account-email">{{ profileHomeBranch || '—' }}</span>
          </div>
          <div class="setting-row">
            <button class="inline-open" @click="profileEditing = true">Edit profile</button>
          </div>
        </template>
        <template v-else>
          <div class="setting-row">
            <label class="setting-label" for="profile-name">Name</label>
            <input id="profile-name" v-model="profileName" class="profile-input" type="text"
                   maxlength="40" autocomplete="given-name"
            >
          </div>
          <div class="setting-row">
            <span class="setting-label">Home branch</span>
            <div class="profile-branch-wrap">
              <BranchCombobox v-model="profileHomeBranch" placeholder="Search branches…" />
            </div>
          </div>
          <div class="setting-row">
            <button class="profile-save-btn" :disabled="profileSaving" @click="saveProfile">
              {{ profileSaving ? 'Saving…' : 'Save' }}
            </button>
            <button v-if="isSignedIn" class="profile-cancel-btn" @click="cancelProfileEdit">Cancel</button>
          </div>
        </template>
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

    <!-- Install -->
    <section v-if="showInstallSection" class="settings-group">
      <p class="section-label">Install</p>
      <InstallHelperCard />
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
          <span class="about-val">{{ appVersion }}</span>
        </div>
        <div class="about-row">
          <span class="setting-label">Developed by</span>
          <a href="https://www.github.com/bennygoldman" target="_blank" rel="noopener" class="about-link"
             aria-label="Benny Goldman on GitHub (opens another site)"
          >
            Benny Goldman<IconExternal class="external-icon" aria-hidden="true" />
          </a>
        </div>
        <div class="about-row">
          <p class="disclaimer">This is an unofficial app and is not affiliated with or endorsed by Toronto Public Library.</p>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'
import { authClient } from '~/lib/auth-client'
import { pushProfile } from '~/composables/useProfileSync'
import { isRunningStandalone } from '~/lib/installHelper'
import { useInstallPrompt } from '~/composables/useInstallPrompt'
import IconExternal from '~/components/icons/IconExternal.vue'
import { signOutAndClear } from '~/composables/useAccountSync'
import { useAccount, useAuthKnown, useAuthSettled, useSignedIn } from '~/composables/useAuthState'

const { $posthog } = useNuxtApp()
const passport = usePassportStore()
const { public: { isDev, appVersion } } = useRuntimeConfig()
const { installedThisSession } = useInstallPrompt()
const runningStandalone = ref(true)
// Shown once mounted, unless the app is installed or was just installed here.
const showInstallSection = computed(() => !runningStandalone.value && !installedThisSession.value)
const isSignedIn = useSignedIn()
const account = useAccount()
// Until there's an answer (only on a device's very first visit), the account
// card stays empty rather than showing "Sign in" to someone signed in.
const authSettled = useAuthSettled()
// Account actions wait for the server to confirm the session, in case the
// remembered one has expired.
const authKnown = useAuthKnown()
// Signed-out users edit the profile straight away; signed-in users see it
// read-only with an Edit button.
const profileEditing = ref(!isSignedIn.value)
type ToastKind = 'success' | 'error'
const inlineToast = ref<{ text: string, kind: ToastKind }>({ text: '', kind: 'success' })

watch(() => passport.profile.theme, (theme) => {
  $posthog?.capture('theme_changed', { theme: theme || 'system' })
})

// Set when the accounts lookup can't answer, so the change-email and password
// forms still show (the safe default) without remembering a guess.
const accountsLookupFailed = ref(false)
const showCredentialForms = computed(() =>
  account.value?.isGoogle === false || (account.value?.isGoogle == null && accountsLookupFailed.value)
)

// Whether the account signs in with Google alone. The remembered answer shows
// at once; it's checked again on each visit, once app.vue has confirmed the
// session, since a password can be added to the account at any time.
let checkedThisVisit = false
async function checkAccountType() {
  if (checkedThisVisit || !authKnown.value || !isSignedIn.value || !account.value) return
  checkedThisVisit = true
  accountsLookupFailed.value = false
  if (typeof authClient.listAccounts !== 'function') {
    accountsLookupFailed.value = true
    return
  }
  try {
    const { data: accounts, error } = await authClient.listAccounts()
    if (error || !Array.isArray(accounts)) {
      accountsLookupFailed.value = true
      return
    }
    // Hide the change-email/password forms only when the user has no
    // password (credential) account, i.e. signs in with Google alone. A user
    // with both a password and a linked Google login keeps the forms.
    const isGoogle = accounts.length > 0 && !accounts.some(a => a.providerId === 'credential')
    if (account.value) account.value = { ...account.value, isGoogle }
  } catch {
    accountsLookupFailed.value = true
  }
}

// Sign-in and sign-out elsewhere, or app.vue's session check finishing after
// this page opened, switch the profile between read-only and editable.
watch(isSignedIn, (signedIn) => {
  profileEditing.value = !signedIn
  if (!signedIn) checkedThisVisit = false
})
watch([authKnown, isSignedIn, () => account.value?.email], () => { void checkAccountType() })

onMounted(() => {
  runningStandalone.value = isRunningStandalone()
  void checkAccountType()
})

// Profile editing
const profileName = ref(passport.profile.name ?? '')
const profileHomeBranch = ref(passport.profile.homeBranch ?? '')

// The account sync in app.vue can finish after this page mounts (e.g. when
// opening /settings directly). Keep the read-only view in step with the store.
watch(() => [passport.profile.name, passport.profile.homeBranch], ([name, homeBranch]) => {
  if (profileEditing.value) return
  profileName.value = name ?? ''
  profileHomeBranch.value = homeBranch ?? ''
})
const profileSaving = ref(false)

function showToast(text: string, kind: ToastKind = 'success') {
  inlineToast.value = { text, kind }
  window.setTimeout(() => {
    if (inlineToast.value.text === text) inlineToast.value = { text: '', kind: 'success' }
  }, 2400)
}

async function saveProfile() {
  profileSaving.value = true
  try {
    passport.profile.name = profileName.value
    passport.profile.homeBranch = profileHomeBranch.value
    await pushProfile({ name: profileName.value, homeBranch: profileHomeBranch.value || null })
    $posthog?.capture('profile_updated')
    profileEditing.value = false
    showToast('Profile updated.')
  } finally {
    profileSaving.value = false
  }
}

function cancelProfileEdit() {
  profileName.value = passport.profile.name ?? ''
  profileHomeBranch.value = passport.profile.homeBranch ?? ''
  profileEditing.value = false
}

const signingOut = ref(false)

async function signOut() {
  signingOut.value = true
  try {
    const result = await signOutAndClear()
    if (!result.ok) {
      showToast(result.reason, 'error')
      return
    }
  } finally {
    signingOut.value = false
  }
  profileName.value = ''
  profileHomeBranch.value = ''
  profileEditing.value = true
}

// Demo mode
const demoModes = [
  { value: 'empty',     label: 'Empty',    icon: '📖', count: '0 stamps' },
  { value: 'mid',       label: 'Mid-way',  icon: '🗺️', count: '28 stamps' },
  { value: 'completed', label: 'Complete', icon: '🏆', count: `${physicalBranches.length} stamps` },
] as const

type DemoMode = (typeof demoModes)[number]['value']

const activeDemoMode = ref<DemoMode>('empty')

function setDemo(mode: DemoMode) {
  activeDemoMode.value = mode
  passport.loadDemoState(mode)
  $posthog?.capture('demo_mode_activated', { demo_state: mode })
}
</script>

<style scoped>
.inline-toast {
  margin-bottom: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--tpl-blue) 25%, transparent);
  background: color-mix(in srgb, var(--tpl-blue) 8%, var(--color-surface));
  color: var(--color-text-mid);
  font-size: 0.875rem;
  padding: 10px 12px;

  &.error {
    border-color: color-mix(in srgb, var(--color-error) 35%, transparent);
    background: color-mix(in srgb, var(--color-error) 10%, var(--color-surface));
    color: var(--color-error);
  }
}

.settings-group {
  margin-bottom: 24px;
}

/* ── Profile ──────────────────────────────────── */
.profile-input {
  font-size: 1rem;
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
    font-size: 1rem;
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

.profile-cancel-btn {
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  background: none;
  border: none;
  padding: 0;
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

.provider-note {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-soft);
  font-size: 0.875rem;
  color: var(--color-text-muted);
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
