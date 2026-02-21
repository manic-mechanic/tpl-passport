<template>
  <main class="page-content">
    <header class="page-header">
      <div class="brand">
        <img src="/tpl-meta.png" class="tpl-logo" alt="Toronto Public Library" />
        <span class="brand-title">passport<span class="brand-colon">:</span></span>
      </div>
    </header>

    <!-- Passport document card -->
    <section class="settings-group">
      <p class="section-label">Your Passport</p>
      <div class="passport-doc">

        <!-- Document header band -->
        <div class="doc-header">
          <img src="/tpl-meta-card.png" class="doc-seal" alt="" aria-hidden="true" />
          <div class="doc-header-text">
            <p class="doc-country">CANADA · TORONTO PUBLIC LIBRARY</p>
            <p class="doc-type">PASSPORT / PASSEPORT</p>
          </div>
          <span class="doc-type-code">P</span>
        </div>

        <!-- Photo + primary fields -->
        <div class="doc-body">
          <div class="doc-photo">
            <div class="avatar" :style="avatarStyle">
              <span class="avatar-letter">{{ avatarLetter }}</span>
            </div>
            <span class="doc-photo-label">PHOTO</span>
          </div>

          <div class="doc-fields">
            <div class="doc-field">
              <label class="doc-field-label" for="name-input">Name / Nom</label>
              <input
                id="name-input"
                v-model="passport.profile.name"
                type="text"
                class="doc-field-input"
                placeholder="Your name"
                autocomplete="off"
              />
            </div>
            <div class="doc-field">
              <label class="doc-field-label" for="book-input">Favourite Book</label>
              <input
                id="book-input"
                v-model="passport.profile.favouriteBook"
                type="text"
                class="doc-field-input"
                placeholder="Title or author"
                autocomplete="off"
              />
            </div>
            <div class="doc-field">
              <label class="doc-field-label" for="home-input">Home Branch</label>
              <select
                id="home-input"
                v-model="passport.profile.homeBranch"
                class="doc-field-input doc-field-select"
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
        </div>

        <!-- Stats row -->
        <div class="doc-stats">
          <div class="doc-stat">
            <span class="doc-field-label">Stamps Collected</span>
            <span class="doc-stat-val">{{ passport.visitCount }} / {{ physicalBranches.length }}</span>
          </div>
          <div class="doc-stat">
            <span class="doc-field-label">Progress</span>
            <span class="doc-stat-val">{{ progressPct }}%</span>
          </div>
          <div class="doc-stat">
            <span class="doc-field-label">Issued</span>
            <span class="doc-stat-val">{{ issueYear }}</span>
          </div>
        </div>

        <!-- Machine-readable zone -->
        <div class="doc-mrz">
          <p class="mrz-line">P&lt;CAN{{ mrzLine1 }}</p>
          <p class="mrz-line">{{ mrzLine2 }}</p>
        </div>
      </div>
    </section>

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
          <NuxtLink to="/qr-print" class="about-link">Branch QR Codes →</NuxtLink>
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

const progressPct = computed(() =>
  Math.round((passport.visitCount / physicalBranches.length) * 100)
)

const issueYear = new Date().getFullYear()

// MRZ — decorative, based on real MRZ format rules
// Line 1: P<CAN + surname<<given<names (padded to 39 chars after prefix)
const mrzLine1 = computed(() => {
  const raw = (passport.profile.name || 'COLLECTOR').toUpperCase()
  const parts = raw.replace(/[^A-Z ]/g, '').split(' ').filter(Boolean)
  const surname = parts[0] ?? 'COLLECTOR'
  const given   = parts.slice(1).join('<') || ''
  const nameStr = given ? `${surname}<<${given}` : `${surname}`
  return nameStr.padEnd(39, '<').slice(0, 39)
})

// Line 2: passport number + check + country + DOB stub + personal number + progress
const mrzLine2 = computed(() => {
  const num     = `TPL${String(passport.visitCount).padStart(5, '0')}`
  const country = 'CAN'
  const dob     = `${issueYear}`.slice(-2) + '0101'  // YYMMDD
  const pct     = String(progressPct.value).padStart(3, '0')
  const raw     = `${num}0${country}${dob}0M260101${pct}PCT`
  return raw.padEnd(44, '<').slice(0, 44)
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

/* ── Passport document card ───────────────────── */
.passport-doc {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-soft);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

/* Document header */
.doc-header {
  background: var(--tpl-navy);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.doc-seal {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: brightness(10);
  opacity: 0.8;
  flex-shrink: 0;
}

.doc-header-text {
  flex: 1;
}

.doc-country {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.55);
}

.doc-type {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #ffffff;
  margin-top: 1px;
}

.doc-type-code {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 700;
  color: rgba(255,255,255,0.2);
  line-height: 1;
  font-optical-sizing: auto;
}

/* Photo + fields */
.doc-body {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border-soft);
}

.doc-photo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.avatar {
  width: 72px;
  height: 88px;
  border-radius: 6px;
  border: 2px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-letter {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  font-optical-sizing: auto;
}

.doc-photo-label {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

/* Fields */
.doc-fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.doc-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-bottom: 1px solid var(--color-border-soft);
  padding-bottom: 8px;
}

.doc-field:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.doc-field-label {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.doc-field-input {
  font-size: 1rem; /* 16px — prevents iOS Safari auto-zoom */
  font-family: var(--font-body);
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  width: 100%;
}

.doc-field-input::placeholder { color: var(--color-border); }

.doc-field-select {
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

/* Stats row */
.doc-stats {
  display: flex;
  border-bottom: 1px solid var(--color-border-soft);
}

.doc-stat {
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-right: 1px solid var(--color-border-soft);
}

.doc-stat:last-child { border-right: none; }

.doc-stat-val {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  font-optical-sizing: auto;
}

/* MRZ */
.doc-mrz {
  background: var(--tpl-navy);
  padding: 10px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mrz-line {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.35);
  white-space: nowrap;
  overflow: hidden;
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
  flex-shrink: 0;
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
