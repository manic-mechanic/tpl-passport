<script setup lang="ts">
import IconSettingsGear from '~/components/icons/IconSettingsGear.vue';

</script>

<template>
  <main class="page-content">

    <div class="home-top-bar">
      <img src="/tpl-meta-card.png" class="top-bar-seal" alt="" aria-hidden="true" />
      <p class="top-bar-wordmark">passport<span>:</span></p>
      <NuxtLink to="/settings" class="top-bar-settings" aria-label="Settings">
        <IconSettingsGear />
      </NuxtLink>
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

.top-bar-settings {
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
  -webkit-tap-highlight-color: transparent;
}

.top-bar-settings svg {
  width: 22px;
  height: 22px;
}

:deep(.badges-strip) {
  margin-top: -10px;
}
</style>
