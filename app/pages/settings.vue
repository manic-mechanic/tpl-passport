<template>
  <main class="page-content">
    <header class="page-header">
      <div class="brand">
        <img src="/tpl-meta.png" class="tpl-logo" alt="Toronto Public Library" />
        <span class="brand-title">passport<span class="brand-colon">:</span></span>
      </div>
    </header>

    <!-- Appearance -->
    <section class="settings-group">
      <p class="section-label">Appearance</p>
      <div class="settings-card card">
        <div class="setting-row">
          <span class="setting-label">Theme</span>
          <div class="theme-toggle">
            <button
              class="theme-btn"
              :class="{ 'theme-btn--active': passport.profile.theme === 'light' }"
              @click="passport.profile.theme = 'light'"
            >Light</button>
            <button
              class="theme-btn"
              :class="{ 'theme-btn--active': passport.profile.theme === '' }"
              @click="passport.profile.theme = ''"
            >Auto</button>
            <button
              class="theme-btn"
              :class="{ 'theme-btn--active': passport.profile.theme === 'dark' }"
              @click="passport.profile.theme = 'dark'"
            >Dark</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Demo mode — dev only -->
    <section v-if="isDev" class="settings-group">
      <p class="section-label">Demo mode</p>
      <div class="demo-grid">
        <button
          v-for="mode in demoModes"
          :key="mode.value"
          class="demo-btn"
          :class="{ 'demo-btn--active': activeDemoMode === mode.value }"
          @click="setDemo(mode.value)"
        >
          <span class="demo-icon">{{ mode.icon }}</span>
          <span class="demo-label">{{ mode.label }}</span>
          <span class="demo-count">{{ mode.count }}</span>
        </button>
      </div>
    </section>

    <!-- Developer — dev only -->
    <section v-if="isDev" class="settings-group">
      <p class="section-label">Developer</p>
      <div class="settings-card card">
        <div class="setting-row">
          <div>
            <span class="setting-label">Bypass location fence</span>
            <p class="setting-hint">Allow check-in from anywhere, regardless of distance to branch.</p>
          </div>
          <div class="theme-toggle">
            <button
              class="theme-btn"
              :class="{ 'theme-btn--active': !passport.profile.bypassLocationFence }"
              @click="passport.profile.bypassLocationFence = false"
            >Off</button>
            <button
              class="theme-btn"
              :class="{ 'theme-btn--active': passport.profile.bypassLocationFence }"
              @click="passport.profile.bypassLocationFence = true"
            >On</button>
          </div>
        </div>
      </div>
    </section>

    <!-- About -->
    <section class="settings-group">
      <p class="section-label">About</p>
      <div class="about-card card">
        <div class="about-row">
          <span class="setting-label">Version</span>
          <span class="about-val">1.0 MVP</span>
        </div>
        <div class="about-row about-row--link">
          <a href="https://tpl.ca" target="_blank" class="about-link">Toronto Public Library ↗</a>
        </div>
      </div>
    </section>

  </main>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { physicalBranches } from '~/composables/useRegion'

const passport = usePassportStore()
const { public: { isDev } } = useRuntimeConfig()

// Demo mode
const demoModes = [
  { value: 'empty',     label: 'Empty',    icon: '📖', count: '0 stamps' },
  { value: 'mid',       label: 'Mid-way',  icon: '🗺️', count: '28 stamps' },
  { value: 'completed', label: 'Complete', icon: '🏆', count: `${physicalBranches.length} stamps` },
]

const activeDemoMode = ref('empty')

function setDemo(mode) {
  activeDemoMode.value = mode
  passport.loadDemoState(mode)
}
</script>

<style scoped>
.page-header {
  padding: 20px 0 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tpl-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.brand-title {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--tpl-navy);
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
}

.brand-colon { color: var(--tpl-blue); }

.settings-group {
  margin-bottom: 24px;
}

/* ── Shared settings card ─────────────────────── */
.settings-card {
  overflow: hidden;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-soft);
}

.setting-row:last-child { border-bottom: none; }

.setting-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 2px;
  line-height: 1.4;
}

/* Theme toggle */
.theme-toggle {
  display: flex;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 3px;
  gap: 2px;
}

.theme-btn {
  flex: 1;
  padding: 5px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.theme-btn--active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

/* Demo */
.demo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.demo-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 14px 8px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  box-shadow: var(--shadow-sm);
}

.demo-btn--active {
  border-color: var(--tpl-blue);
  background: color-mix(in srgb, var(--tpl-blue) 8%, var(--color-surface));
}

.demo-icon { font-size: 1.25rem; }

.demo-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text);
}

.demo-btn--active .demo-label { color: var(--tpl-blue); }

.demo-count {
  font-size: 0.65rem;
  color: var(--color-text-muted);
}

/* About */
.about-card { overflow: hidden; }

.about-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  border-bottom: 1px solid var(--color-border-soft);
  font-size: 0.875rem;
}

.about-row:last-child { border-bottom: none; }
.about-row--link { justify-content: flex-start; }

.about-val { color: var(--color-text-muted); }

.about-link {
  color: var(--tpl-blue);
  font-weight: 600;
  font-size: 0.875rem;
}
</style>
