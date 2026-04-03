<script setup lang="ts">
import IconNavCheckIn from './icons/IconNavCheckIn.vue';
import IconNavExplore from './icons/IconNavExplore.vue';
import IconNavHome from './icons/IconNavHome.vue';
import IconNavPassport from './icons/IconNavPassport.vue';

</script>

<template>
  <nav class="bottom-nav">
    <NuxtLink to="/" class="nav-item" active-class="nav-item-active" exact>
      <IconNavHome class="nav-icon" />
      <span class="nav-label">Home</span>
    </NuxtLink>

    <NuxtLink to="/explore" class="nav-item" active-class="nav-item-active">
      <IconNavExplore class="nav-icon" />
      <span class="nav-label">Explore</span>
    </NuxtLink>

    <NuxtLink to="/passport" class="nav-item" active-class="nav-item-active">
      <IconNavPassport class="nav-icon" />
      <span class="nav-label">Passport</span>
    </NuxtLink>

    <!-- Primary action — check-in -->
    <NuxtLink to="/check-in" class="nav-item nav-item-checkin" active-class="nav-item-active">
      <div class="checkin-orb">
        <IconNavCheckIn class="nav-icon" />
      </div>
      <span class="nav-label">Check In</span>
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
  box-shadow: 0 4px 12px rgba(0, 95, 192, 0.45);
  transition: transform 0.15s ease, background 0.15s;

  @media (prefers-color-scheme: dark) {
    & {
      box-shadow: none;
    }
  }
}

:global([data-theme="dark"]) .checkin-orb {
  box-shadow: none;
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
