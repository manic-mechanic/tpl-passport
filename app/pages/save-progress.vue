<template>
  <main class="save-progress">
    <div class="hero" aria-hidden="true">
      <BranchMap class="hero-map" :lit="visitedCodes" :here="latestCode" :focus="latestCode" :zoom="latestCode ? 1.35 : 1" :dot="3" />
      <div v-if="passport.profile.name" class="chip">
        <span class="chip-name">{{ passport.profile.name }}</span>
        <span class="chip-count">{{ passport.visitCount }} / {{ total }}</span>
      </div>
    </div>

    <div class="sheet">
      <h1 class="title">Save your progress</h1>
      <p class="text">Sign in to use your passport on any device.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="button" class="btn btn--google" :disabled="googleLoading" @click="signInWithGoogle">
        <IconGoogle class="google-icon" />
        Continue with Google
      </button>
      <NuxtLink to="/login" class="btn btn--email" @click="choose('email')">Continue with email</NuxtLink>
      <NuxtLink to="/" class="not-now" @click="choose('not_now')">Not now</NuxtLink>
    </div>
  </main>
</template>

<script setup lang="ts">
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'
import { useSignedIn } from '~/composables/useAuthState'
import { authClient } from '~/lib/auth-client'
import { reportError } from '~/lib/reportError'
import IconGoogle from '~/components/icons/IconGoogle.vue'

// Offered to signed-out people after "Make your passport".

const { $posthog } = useNuxtApp()
const passport = usePassportStore()
const signedIn = useSignedIn()

const total = physicalBranches.length
const visitedCodes = computed(() => [...passport.visitedBranchCodes])
const latestCode = computed(() => passport.checkIns[0]?.branchCode ?? '')
const googleLoading = ref(false)
const error = ref('')

onMounted(() => {
  if (signedIn.value) navigateTo('/', { replace: true })
  else $posthog?.capture('save_progress_shown', { total_visits: passport.checkIns.length })
})

function choose(action: 'google' | 'email' | 'not_now') {
  $posthog?.capture('save_progress_tapped', { action })
}

async function signInWithGoogle() {
  choose('google')
  error.value = ''
  googleLoading.value = true
  $posthog?.capture('google_signin_attempted')
  sessionStorage.setItem('google_signin_pending', Date.now().toString())
  try {
    await authClient.signIn.social({ provider: 'google', callbackURL: window.location.origin + '/' })
  } catch (e) {
    reportError(e, { area: 'auth', operation: 'google_signin' })
    error.value = 'Google sign-in failed. Please try again.'
    googleLoading.value = false
  }
}
</script>

<style scoped>
.save-progress {
  min-height: 100svh;
  min-height: 100dvh;
  padding-bottom: calc(var(--nav-height) + 16px);
  background: var(--color-bg);
}

.hero {
  position: relative;
  height: calc(340px + env(safe-area-inset-top));
}

.hero-map {
  position: absolute;
  inset: 0;
}

.chip {
  position: absolute;
  left: 22px;
  top: calc(40px + env(safe-area-inset-top));
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  box-shadow: 0 8px 20px -8px rgba(0, 28, 113, 0.35);
}

.chip-name {
  font-weight: 700;
  font-size: 0.9375rem;
}

.chip-count {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--color-brand-text);
}

.sheet {
  position: relative;
  margin-top: -40px;
  padding: 26px 22px 0;
  border-radius: 24px 24px 0 0;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.title {
  font-family: var(--font-display);
  font-size: 2.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--color-brand-text);
  font-optical-sizing: auto;
}

.text {
  margin-bottom: 10px;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--color-text-mid);
}

.error {
  font-size: 0.875rem;
  color: var(--color-error);
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px;
  border-radius: var(--radius);
  font: 600 1rem var(--font-body);
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.1s;

  &:not(:disabled):active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}

.btn--google {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.google-icon {
  width: 18px;
  height: 18px;
}

.btn--email {
  border: none;
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  font-weight: 700;
}

.not-now {
  align-self: center;
  padding: 10px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}
</style>
