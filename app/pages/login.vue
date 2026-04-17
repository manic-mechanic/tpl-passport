<template>
  <main class="login-page">
    <header class="login-header">
      <NuxtLink to="/settings" class="back-link">← Back</NuxtLink>
      <div class="brand">
        <img src="/tpl-meta.png" class="tpl-logo" alt="Toronto Public Library" />
        <span class="brand-title">passport<span class="brand-colon">:</span></span>
      </div>
      <p class="brand-tagline">Sign in to save your progress</p>
    </header>

    <div class="login-card card">
      <!-- Tab toggle -->
      <div class="tab-row">
        <button class="tab-btn" :class="{ active: mode === 'signin' }" @click="mode = 'signin'">Sign in</button>
        <button class="tab-btn" :class="{ active: mode === 'signup' }" @click="mode = 'signup'">Create account</button>
      </div>

      <form class="auth-form" @submit.prevent="submitEmail">
        <div v-if="mode === 'signup'" class="field">
          <label class="field-label" for="name">Name</label>
          <input id="name" v-model="name" type="text" class="field-input" placeholder="Your name" autocomplete="name"
                 required
          />
        </div>

        <div class="field">
          <label class="field-label" for="email">Email</label>
          <input id="email" v-model="email" type="email" class="field-input" placeholder="you@example.com"
                 autocomplete="email" required
          />
        </div>

        <div class="field">
          <label class="field-label" for="password">Password</label>
          <input id="password" v-model="password" type="password" class="field-input" placeholder="••••••••"
                 autocomplete="current-password" required
          />
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account' }}
        </button>
      </form>

      <div class="divider"><span>or</span></div>

      <button class="btn-google" :disabled="loading || googleLoading" @click="signInWithGoogle">
        <IconGoogle class="google-icon" />
        Continue with Google
      </button>
    </div>
  </main>
</template>

<script setup>
import * as Sentry from '@sentry/nuxt'
import IconGoogle from '~/components/icons/IconGoogle.vue'
import { authClient } from '~/lib/auth-client'
import { usePassportStore } from '~/stores/passport'
import { fetchProfile, pushProfile } from '~/composables/useProfileSync'
import { fetchCheckIns, pushCheckIn } from '~/composables/useCheckInSync'
import { reportError } from '~/lib/reportError'
import { reconcileCheckIns } from '~/lib/checkInSyncMerge'
import { reconcileProfile } from '~/lib/profileSyncMerge'

const { $posthog } = useNuxtApp()
const passport = usePassportStore()

const mode = ref('signin')
const name = ref(passport.profile.name ?? '')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const googleLoading = ref(false)

async function syncAfterSignIn(userName) {
  const serverProfile = await fetchProfile()
  const { nextName, nextHomeBranch, shouldPushHomeBranch } = reconcileProfile(
    passport.profile,
    serverProfile,
    userName ?? ''
  )
  passport.profile.name = nextName
  passport.profile.homeBranch = nextHomeBranch
  if (shouldPushHomeBranch) {
    pushProfile({ name: passport.profile.name, homeBranch: passport.profile.homeBranch })
  }
  try {
    const serverCheckIns = await fetchCheckIns()
    const { merged, localOnly } = reconcileCheckIns(serverCheckIns, passport.checkIns)
    passport.setCheckIns(merged)
    for (const ci of localOnly) pushCheckIn(ci)
  } catch (error) {
    reportError(error, {
      area: 'sync',
      operation: 'post_signin_checkin_merge',
    })
  }
}

async function submitEmail() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'signin') {
      const { data, error: err } = await authClient.signIn.email({
        email: email.value,
        password: password.value,
        callbackURL: '/',
      })
      if (err) { error.value = err.message; return }
      await syncAfterSignIn(data?.user?.name)
      Sentry.setUser({ id: data.user.id })
      $posthog?.capture('sign_in_completed', { method: 'email' })
    } else {
      const { data: signUpData, error: err } = await authClient.signUp.email({
        name: name.value,
        email: email.value,
        password: password.value,
        callbackURL: '/',
      })
      if (err) { error.value = err.message; return }
      if (!passport.profile.name && name.value) passport.profile.name = name.value
      await pushProfile({ name: name.value, homeBranch: null })
      Sentry.setUser({ id: signUpData.user.id })
      $posthog?.capture('sign_up_completed', { method: 'email', name_set: !!name.value })
    }
    navigateTo('/')
  } finally {
    loading.value = false
  }
}

async function signInWithGoogle() {
  error.value = ''
  googleLoading.value = true
  $posthog?.capture('google_signin_attempted')
  sessionStorage.setItem('google_signin_pending', Date.now().toString())
  try {
    await authClient.signIn.social({ provider: 'google', callbackURL: window.location.origin + '/' })
  } catch (e) {
    reportError(e, {
      area: 'auth',
      operation: 'google_signin',
    })
    error.value = 'Google sign-in failed. Please try again.'
    googleLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100dvh;
  padding: 0 16px 40px;
  max-width: 480px;
  margin: 0 auto;
}

.login-header {
  padding: 20px 0 24px;
}

.back-link {
  display: inline-block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tpl-blue);
  margin-bottom: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.tpl-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.brand-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--tpl-navy);
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
}

.brand-colon {
  color: var(--tpl-blue);
}

.brand-tagline {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.login-card {
  padding: 0;
  overflow: hidden;
}

/* Tabs */
.tab-row {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.tab-btn {
  flex: 1;
  padding: 14px;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;

  &.active {
    color: var(--tpl-blue);
    border-bottom-color: var(--tpl-blue);
  }
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.field-input {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;

  &:focus {
    border-color: var(--tpl-blue);
  }
}

.field-optional {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-muted);
}

.combobox-wrap {
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  padding: 0 12px;
  transition: border-color 0.15s;

  &:focus-within {
    border-color: var(--tpl-blue);
  }

  :deep(.combo-input) {
    width: 100%;
    padding: 12px 0;
    font-size: 1rem;
    font-family: var(--font-body);
    color: var(--color-text);
    background: transparent;
    border: none;
    outline: none;
  }
}

.error-msg {
  font-size: 0.875rem;
  color: #c0392b;
  margin: 0;
}

.btn-primary {
  width: 100%;
  padding: 16px;
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-body);
  color: #fff;
  background: var(--tpl-blue);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: opacity 0.15s;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  color: var(--color-text-muted);
  font-size: 0.75rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }
}

/* Google button */
.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  margin: 16px 16px 20px;
  width: calc(100% - 32px);
  padding: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--color-text-muted);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.google-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
</style>
