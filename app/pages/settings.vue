<template>
  <main class="page-content">
    <header class="page-header">
      <div class="brand">
        <img src="/tpl-meta.png" class="tpl-logo" alt="Toronto Public Library" />
        <span class="brand-title">passport<span class="brand-colon">:</span></span>
      </div>
    </header>

    <!-- Profile card -->
    <section class="settings-group">
      <p class="section-label">Profile</p>
      <div class="settings-card card">

        <!-- Avatar row -->
        <div class="setting-row setting-row--avatar">
          <div class="avatar" :style="avatarStyle">
            <span class="avatar-letter">{{ avatarLetter }}</span>
          </div>
          <div class="avatar-meta">
            <p class="avatar-name">{{ passport.profile.name || 'Collector' }}</p>
            <p class="avatar-sub">{{ passport.visitCount }} of {{ physicalBranches.length }} stamps</p>
          </div>
          <!-- placeholder for future photo upload -->
          <button class="avatar-edit-btn" disabled title="Photo upload coming soon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="15" height="15">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        </div>

        <div class="setting-row">
          <label class="setting-label" for="name-input">Name</label>
          <input
            id="name-input"
            v-model="passport.profile.name"
            type="text"
            class="setting-input"
            placeholder="Your name"
          />
        </div>
        <div class="setting-row">
          <label class="setting-label" for="book-input">Favourite book</label>
          <input
            id="book-input"
            v-model="passport.profile.favouriteBook"
            type="text"
            class="setting-input"
            placeholder="Title or author"
          />
        </div>
        <div class="setting-row setting-row--select">
          <label class="setting-label" for="home-input">Home branch</label>
          <select
            id="home-input"
            v-model="passport.profile.homeBranch"
            class="setting-select"
          >
            <option value="">None selected</option>
            <option
              v-for="b in sortedBranches"
              :key="b.BranchCode"
              :value="b.BranchCode"
            >{{ b.BranchName }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Demo mode -->
    <section class="settings-group">
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

    <!-- About -->
    <section class="settings-group">
      <p class="section-label">About</p>
      <div class="about-card card">
        <div class="about-row">
          <span class="setting-label">Version</span>
          <span class="about-val">1.0 MVP</span>
        </div>
        <div class="about-row">
          <span class="setting-label">Branches</span>
          <span class="about-val">{{ physicalBranches.length }} Toronto branches</span>
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
import { useStampColor } from '~/composables/useStampColor'

const passport = usePassportStore()

// Avatar
const avatarLetter = computed(() => {
  const name = passport.profile.name?.trim()
  return name ? name[0].toUpperCase() : '?'
})

const avatarStyle = computed(() => {
  const code = passport.profile.homeBranch
  const branch = code ? physicalBranches.find(b => b.BranchCode === code) : null
  const { color, bg, border } = branch
    ? useStampColor(branch.WardNo)
    : { color: 'var(--tpl-blue)', bg: 'color-mix(in srgb, var(--tpl-blue) 12%, var(--color-paper))', border: 'color-mix(in srgb, var(--tpl-blue) 30%, transparent)' }
  return { color, background: bg, borderColor: border }
})

// Home branch selector — sorted alphabetically
const sortedBranches = computed(() =>
  [...physicalBranches].sort((a, b) => a.BranchName.localeCompare(b.BranchName))
)

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

/* Profile */
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

/* Avatar row */
.setting-row--avatar {
  gap: 12px;
  justify-content: flex-start;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-letter {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  font-optical-sizing: auto;
}

.avatar-meta {
  flex: 1;
  min-width: 0;
}

.avatar-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.avatar-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 1px;
}

.avatar-edit-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
  flex-shrink: 0;
}

.setting-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  flex-shrink: 0;
}

.setting-input {
  border: none;
  outline: none;
  text-align: right;
  font-size: 0.875rem;
  font-family: var(--font-body);
  color: var(--color-text-mid);
  background: transparent;
  width: 160px;
}

.setting-input::placeholder { color: var(--color-text-muted); }

.setting-row--select {
  align-items: center;
}

.setting-select {
  border: none;
  outline: none;
  text-align: right;
  font-size: 0.85rem;
  font-family: var(--font-body);
  color: var(--color-text-mid);
  background: transparent;
  max-width: 170px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
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
  background: color-mix(in srgb, var(--tpl-blue) 6%, white);
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
