<script setup>
import { authClient } from '~/lib/auth-client'
import { usePassportStore } from '~/stores/passport'

const passport = usePassportStore()

const isSignedIn = ref(false)
const bannerDismissed = ref(false)

onMounted(async () => {
  bannerDismissed.value = localStorage.getItem('signin_banner_dismissed') === '1'
  const { data } = await authClient.getSession()
  isSignedIn.value = !!data
})

const showBanner = computed(() =>
  !isSignedIn.value && passport.checkIns.length > 0 && !bannerDismissed.value
)

function dismissBanner() {
  bannerDismissed.value = true
  localStorage.setItem('signin_banner_dismissed', '1')
}
</script>

<template>
  <main class="page-content">
    <div class="home-top-bar">
      <img src="/tpl-meta-card.png" class="top-bar-seal" alt="" aria-hidden="true" />
      <p class="top-bar-wordmark">passport<span>:</span></p>
    </div>

    <div v-if="showBanner" class="signin-banner">
      <div class="signin-banner__body">
        <p class="signin-banner__text">Save your progress — access your passport on any device</p>
        <NuxtLink to="/login" class="signin-banner__link">Sign in →</NuxtLink>
      </div>
      <button class="signin-banner__dismiss" aria-label="Dismiss" @click="dismissBanner">✕</button>
    </div>

    <PassportCard />
    <RecentVisits />

    <HomeBadgesStrip />
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  gap: 18px;
}

.home-top-bar {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 10;
  margin: 0 -18px;
  padding: 10px 16px;
  background: var(--tpl-navy);
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-bar-seal {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: contain;
  opacity: 0.85;
}

.top-bar-wordmark {
  flex: 1;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
  line-height: 1;
}

.top-bar-wordmark span {
  color: rgba(255, 255, 255, 0.55);
}


.signin-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: color-mix(in srgb, var(--tpl-blue) 8%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--tpl-blue) 22%, transparent);
  border-radius: var(--radius);
  margin-top: -8px;
}

.signin-banner__body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.signin-banner__text {
  font-size: 0.875rem;
  color: var(--color-text-mid);
  line-height: 1.4;
}

.signin-banner__link {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--tpl-blue);
  white-space: nowrap;
  flex-shrink: 0;
}

.signin-banner__dismiss {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  flex-shrink: 0;
}

:deep(.badges-strip) {
  margin-top: -10px;
}
</style>
