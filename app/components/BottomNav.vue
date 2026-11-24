<script setup lang="ts">
import { scrollAppTo } from '~/lib/appScroller'
import { CHECK_IN_ROUTE } from '~/lib/checkInEntry'
import IconNavCheckIn from './icons/IconNavCheckIn.vue';
import IconNavExplore from './icons/IconNavExplore.vue';
import IconNavHome from './icons/IconNavHome.vue';
import IconNavPassport from './icons/IconNavPassport.vue';
import IconSettingsGear from './icons/IconSettingsGear.vue';

const route = useRoute()
const router = useRouter()

// Tapping the tab you're already on scrolls its page back to the top, like
// a native tab bar. (In the installed app, tapping the status bar no longer
// does this: the page scrolls inside #__nuxt, not the document.)
function scrollToTopIfCurrent(to: string) {
  const path = route.path.replace(/\/$/, '') || '/'
  if (path !== to && !(to !== '/' && path.startsWith(to + '/'))) return
  scrollAppTo({ top: 0, behavior: 'smooth' })
}

// On an Explore tab, Explore links to that tab, so tapping it only scrolls
// to the top; /explore itself would redirect to Branches.
const exploreTo = computed(() => route.path.startsWith('/explore/') ? route.fullPath : '/explore')

const isBranchDetail = computed(() => route.path.startsWith('/branch/'))

const contextualTab = computed(() => {
  const state = router.options.history.state
  // A visit page: the check-in it confirms, or one opened from History
  // (part of the passport).
  if (route.path.startsWith('/visit/')) return state?.checkedIn === true ? '/check-in' : '/passport'
  if (!isBranchDetail.value) return null
  const back = typeof state?.back === 'string' ? state.back : ''
  const original = typeof state?.originalSource === 'string' ? state.originalSource : ''
  const effective = (back.startsWith('/branch/') && original) ? original : back
  if (effective.startsWith('/passport'))  return '/passport'
  if (effective.startsWith('/check-in'))  return '/check-in'
  if (effective.startsWith('/explore'))   return '/explore'
  if (effective.startsWith('/settings'))  return '/settings'
  if (effective === '/')                  return '/'
  return '/explore'
})
</script>

<template>
  <nav class="bottom-nav">
    <NuxtLink to="/" class="nav-item" active-class="nav-item-active" :class="{ 'nav-item-active': contextualTab === '/' }"
              exact @click="scrollToTopIfCurrent('/')"
    >
      <IconNavHome class="nav-icon" />
      <span class="nav-label">Home</span>
    </NuxtLink>

    <NuxtLink :to="exploreTo" class="nav-item" active-class="nav-item-active" :class="{ 'nav-item-active': contextualTab === '/explore' }"
              @click="scrollToTopIfCurrent('/explore')"
    >
      <IconNavExplore class="nav-icon" />
      <span class="nav-label">Explore</span>
    </NuxtLink>

    <!-- Primary action — check-in (center) -->
    <NuxtLink :to="CHECK_IN_ROUTE" class="nav-item nav-item-checkin" active-class="nav-item-active" :class="{ 'nav-item-active': contextualTab === '/check-in' }"
              @click="scrollToTopIfCurrent('/check-in')"
    >
      <div class="checkin-orb">
        <IconNavCheckIn class="nav-icon" />
      </div>
      <span class="nav-label">Check in</span>
    </NuxtLink>

    <NuxtLink to="/passport" class="nav-item" active-class="nav-item-active" :class="{ 'nav-item-active': contextualTab === '/passport' }"
              @click="scrollToTopIfCurrent('/passport')"
    >
      <IconNavPassport class="nav-icon" />
      <span class="nav-label">Passport</span>
    </NuxtLink>

    <NuxtLink to="/settings" class="nav-item" active-class="nav-item-active" @click="scrollToTopIfCurrent('/settings')">
      <IconSettingsGear class="nav-icon" />
      <span class="nav-label">Settings</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 480px;
  height: var(--nav-height);
  /* Centre the tabs in the bar above the home indicator, not in the whole
     height, so the check-in orb overhangs the top edge by the same amount
     whatever the inset (it's larger in the installed app). */
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--tpl-navy);
  display: flex;
  align-items: center;
  z-index: 100;
  box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.08), 0 -8px 24px rgba(0, 28, 113, 0.2);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
  transition: color 0.15s ease;

  &.nav-item-active {
    color: #ffffff;
  }

  /* Check-in center item — slightly elevated orb */
  &.nav-item-checkin {
    padding-top: 0;

    &:active .checkin-orb {
      transform: scale(0.92);
    }

    &.nav-item-active .checkin-orb {
      background: color-mix(in srgb, var(--tpl-blue) 70%, white);
    }

    & .nav-icon {
      width: 18px;
      height: 18px;
    }
  }
}

.checkin-orb {
  width: 42px;
  height: 42px;
  background: var(--tpl-blue);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
  margin-top: -8px;
  box-shadow: var(--shadow-accent-strong);
  transition: transform 0.15s ease, background 0.15s;

}


.nav-icon {
  width: 22px;
  height: 22px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
