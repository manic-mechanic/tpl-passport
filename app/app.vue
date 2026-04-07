<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <div class="status-bar-fill" aria-hidden="true" />
    <NuxtPage />
    <BottomNav />

    <!-- Passport cover loading screen -->
    <Transition name="cover">
      <div v-if="showCover" class="passport-cover" aria-hidden="true">
        <div class="cover-inner">
          <img src="/tpl-meta-card.png" class="cover-logo" alt="" />
          <p class="cover-title">passport<span class="cover-colon">:</span></p>
          <p class="cover-sub">Toronto Public Library</p>
        </div>
        <!-- Decorative horizontal rule bands like a real passport cover -->
        <div class="cover-band cover-band-top" />
        <div class="cover-band cover-band-bottom" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { BADGES, useBadgeCtx } from '~/composables/useBadges'
import { authClient } from '~/lib/auth-client'

const passport = usePassportStore()
const { $posthog } = useNuxtApp()

// ── Achievement tracking ─────────────────────────────────────────────
const badgeCtx = useBadgeCtx()
let earnedOnMount = null

onMounted(() => {
  earnedOnMount = new Set(BADGES.filter(b => b.earned(badgeCtx.value)).map(b => b.id))
})

watch(badgeCtx, (ctx) => {
  if (!earnedOnMount) return
  for (const badge of BADGES) {
    if (badge.earned(ctx) && !earnedOnMount.has(badge.id)) {
      $posthog?.capture('achievement_unlocked', {
        achievement_id: badge.id,
        achievement_title: badge.title,
      })
      earnedOnMount.add(badge.id)
    }
  }
}, { deep: true })

// ── Home branch change tracking ──────────────────────────────────────
const homeBranchReady = ref(false)

watch(() => passport.profile.homeBranch, () => {
  if (!homeBranchReady.value) return
  $posthog?.capture('home_branch_changed')
})

// Theme watcher — applies data-theme to <html> for manual toggle
watchEffect(() => {
  if (!import.meta.client) return
  const t = passport.profile.theme
  if (t === 'dark')       document.documentElement.setAttribute('data-theme', 'dark')
  else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light')
  else                    document.documentElement.removeAttribute('data-theme')
})

// Show passport cover until app is mounted and ready
const showCover = ref(true)

// Track session so the homeBranch watcher knows whether to push updates.
const isSignedIn = ref(false)

onMounted(async () => {
  setTimeout(() => { showCover.value = false }, 900)

  // Sync auth → passport on every app load.
  // Covers: returning signed-in users, Google OAuth redirects (full page reload).
  const { data } = await authClient.getSession()
  isSignedIn.value = !!data
  if (data?.user?.name) passport.profile.name = data.user.name
  if (data?.user?.homeBranch) {
    passport.profile.homeBranch = data.user.homeBranch
  } else if (data && passport.profile.homeBranch) {
    // Server has no homeBranch but local does — push it up.
    // Covers Google OAuth (no sign-up form) and email sign-in when homeBranch was set before account creation.
    await authClient.updateUser({ homeBranch: passport.profile.homeBranch })
  }
  // Let auth-synced homeBranch watcher flush before enabling analytics
  await nextTick()
  homeBranchReady.value = true
})

// Sync passport → auth whenever homeBranch changes while signed in.
watch(() => passport.profile.homeBranch, async (branch) => {
  if (!isSignedIn.value) return
  await authClient.updateUser({ homeBranch: branch || null })
})
</script>

<style>
.passport-cover {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 480px;
  z-index: 999;
  background: var(--tpl-navy);
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 18px,
      rgba(255,255,255,0.018) 18px,
      rgba(255,255,255,0.018) 19px
    );
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.cover-logo {
  width: 88px;
  height: 88px;
  object-fit: contain;
  border-radius: 50%;
  filter: drop-shadow(0 0 16px rgba(0, 95, 192, 0.5));
}

.cover-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
  line-height: 1;
}

.cover-colon { color: var(--tpl-blue); }

.cover-sub {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

/* Decorative passport bands — gold like a real passport cover */
.cover-band {
  position: absolute;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(184, 152, 90, 0.5) 20%,
    rgba(220, 190, 120, 0.7) 50%,
    rgba(184, 152, 90, 0.5) 80%,
    transparent 100%
  );
  &.cover-band-top    { top: 0; }
  &.cover-band-bottom { bottom: 0; }
}

/* Cover fade-out transition */
.cover-leave-active {
  transition: opacity 0.4s ease;
}
.cover-leave-to {
  opacity: 0;
}
</style>
