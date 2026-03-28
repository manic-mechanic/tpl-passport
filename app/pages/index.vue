<template>
  <main class="page-content">
    <PassportCard />
    <RecentVisits />

    <div class="home-ctas">
      <NuxtLink to="/explore" class="cta-card">
        <span class="cta-title">Explore</span>
        <span class="cta-desc">Plan your next visit <ArrowIcon class="cta-arrow" /></span>
      </NuxtLink>
      <NuxtLink to="/check-in" class="cta-card cta-card--primary">
        <span class="cta-title">Check In</span>
        <span class="cta-desc">Stamp the moment <ArrowIcon class="cta-arrow" /></span>
      </NuxtLink>
    </div>

    <HomeBadgesStrip />
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  gap: 18px;
  /* Dark band behind the card's top gap — shows against the rounded corners */
  background: linear-gradient(to bottom, #000e50 36px, transparent 36px);
}

:deep(.badges-strip) {
  margin-top: auto;
}

.home-ctas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.cta-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: var(--radius);
  background-color: var(--color-paper);
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(0, 28, 113, 0.025) 10px,
    rgba(0, 28, 113, 0.025) 11px
  );
  border: 1px solid var(--color-border-soft);
  text-decoration: none;
}

/* Gold band along the bottom — matches passport cover bands */
.cta-card::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(184, 152, 90, 0.35) 25%,
    rgba(220, 190, 120, 0.55) 50%,
    rgba(184, 152, 90, 0.35) 75%,
    transparent 100%
  );
}

.cta-card--primary {
  background-color: var(--tpl-navy);
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255, 255, 255, 0.03) 10px,
    rgba(255, 255, 255, 0.03) 11px
  );
  border-color: var(--tpl-navy);
}

.cta-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-brand-text);
  font-optical-sizing: auto;
  line-height: 1.2;
}

.cta-card--primary .cta-title { color: #fff; }

.cta-desc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.cta-card--primary .cta-desc { color: rgba(255, 255, 255, 0.5); }

.cta-arrow {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}
</style>
