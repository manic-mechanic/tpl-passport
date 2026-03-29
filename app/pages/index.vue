<template>
  <main class="page-content">

    <div class="home-top-bar">
      <img src="/tpl-meta-card.png" class="top-bar-seal" alt="" aria-hidden="true" />
      <p class="top-bar-wordmark">passport<span>:</span></p>
      <NuxtLink to="/settings" class="top-bar-settings" aria-label="Settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
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
  top: 0;
  z-index: 10;
  margin: 0 -18px;
  padding: calc(env(safe-area-inset-top) + 10px) 16px 10px;
  background: var(--tpl-blue);
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
  font-size: 1.2rem;
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
