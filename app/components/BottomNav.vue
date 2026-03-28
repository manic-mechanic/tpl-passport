<template>
  <nav class="bottom-nav">
    <NuxtLink to="/" class="nav-item" active-class="nav-item--active" exact>
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span class="nav-label">Home</span>
    </NuxtLink>

    <NuxtLink to="/explore" class="nav-item" active-class="nav-item--active">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
      <span class="nav-label">Explore</span>
    </NuxtLink>

    <NuxtLink to="/passport" class="nav-item" active-class="nav-item--active">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
      <span class="nav-label">Passport</span>
    </NuxtLink>

    <!-- Primary action — check-in -->
    <NuxtLink to="/check-in" class="nav-item nav-item--checkin" active-class="nav-item--active">
      <div class="checkin-orb">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <!-- Stamp seal: outer ring + inner ring + check -->
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="5.5" stroke-dasharray="2.5 2"/>
          <polyline points="9.5 12 11 13.5 14.5 10" stroke-width="2"/>
        </svg>
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
  box-shadow: 0 -1px 0 rgba(255,255,255,0.08), 0 -8px 24px rgba(0,28,113,0.2);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  color: rgba(255,255,255,0.45);
  text-decoration: none;
  transition: color 0.15s ease;
}

.nav-item--active {
  color: #ffffff;
}

/* Check-in center item — slightly elevated orb */
.nav-item--checkin {
  padding-top: 0;
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
}

.nav-item--checkin:active .checkin-orb { transform: scale(0.92); }
.nav-item--checkin.nav-item--active .checkin-orb { background: color-mix(in srgb, var(--tpl-blue) 70%, white); }

.nav-item--checkin .nav-icon {
  width: 18px;
  height: 18px;
}

.nav-icon {
  width: 22px;
  height: 22px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-label {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
