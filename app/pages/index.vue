<template>
  <main class="page-content">
    <PassportCard />
    <RecentStamps />
    <HomeBadgesStrip />

    <div class="home-ctas">
      <NuxtLink to="/explore" class="cta-card">
        <span class="cta-title">Explore</span>
        <span class="cta-desc">Find your next branch</span>
      </NuxtLink>
      <NuxtLink to="/check-in" class="cta-card cta-card--primary">
        <span class="cta-title">Check In</span>
        <span class="cta-desc">Stamp your passport</span>
      </NuxtLink>
    </div>
  </main>
</template>

<style scoped>
.home-ctas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 24px;
}

.cta-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 14px;
  border-radius: var(--radius);
  background: var(--color-paper);
  border: 1px solid var(--color-border-soft);
  text-decoration: none;
}

.cta-card--primary {
  background: var(--tpl-navy);
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
  font-size: 0.72rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.cta-card--primary .cta-desc { color: rgba(255, 255, 255, 0.55); }
</style>
