<template>
  <section class="passport-card">
    <div class="card-top">
      <p class="library-name">Toronto Public Library</p>
    </div>

    <div class="card-body">
      <div class="profile-row">
        <div class="profile-fields">
          <div>
            <p class="field-label">Name / Nom</p>
            <input v-model="passport.profile.name" class="name-input" type="text" placeholder="Your name" maxlength="40"
              autocomplete="given-name" :readonly="isSignedIn" />
          </div>
          <div>
            <p class="field-label">Home Branch</p>
            <div v-if="isSignedIn" class="field-value">
              {{ passport.profile.homeBranch ? branchNameForCode(passport.profile.homeBranch) : '—' }}
            </div>
            <div v-else class="combobox-wrap">
              <BranchCombobox v-model="passport.profile.homeBranch" variant="inline" placeholder="—" />
            </div>
          </div>
        </div>
        <div class="avatar">
          <span class="avatar-letter">{{ avatarLetter }}</span>
        </div>
      </div>

      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progressPct + '%' }" />
      </div>

      <div class="stats-row">
        <div class="stat">
          <span class="stat-num">{{ passport.checkIns.length }}</span>
          <span class="stat-label">Visits</span>
        </div>
        <div class="stat">
          <span class="stat-num">{{ overallPct }}%</span>
          <span class="stat-label">Complete</span>
        </div>
        <div class="count-chip">
          <span class="count-chip__num">{{ passport.visitCount }}</span>
          <span class="count-chip__denom">/ {{ totalBranches }}</span>
        </div>
      </div>
    </div>

    <div class="mrz">
      <div class="mrz-lines">
        <p class="mrz-line">{{ mrzLine1 }}</p>
        <p class="mrz-line">{{ mrzLine2 }}</p>
      </div>
      <div class="mrz-issued">
        <span class="mrz-issued__label">Issued</span>
        <span class="mrz-issued__year">{{ issueYear }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { storeToRefs } from 'pinia'
import { physicalBranches } from '~/composables/useRegion'
import { authClient } from '~/lib/auth-client'

function branchNameForCode(code) {
  return physicalBranches.find(b => b.BranchCode === code)?.BranchName ?? code
}

const passport = usePassportStore()

const isSignedIn = ref(false)
onMounted(async () => {
  const { data } = await authClient.getSession()
  isSignedIn.value = !!data
})
const { progressPct, overallPct } = storeToRefs(passport)

const totalBranches = physicalBranches.length
const issueYear = new Date().getFullYear()

const avatarLetter = computed(() => {
  const name = passport.profile.name?.trim()
  return name ? name[0].toUpperCase() : '?'
})

const mrzLine1 = computed(() => {
  const raw = (passport.profile.name || 'TRAVELLER').toUpperCase()
  const parts = raw.replace(/[^A-Z ]/g, '').split(' ').filter(Boolean)
  const surname = parts[0] ?? 'TRAVELLER'
  const given = parts.slice(1).join('<') || ''
  return `P<CAN${(given ? `${surname}<<${given}` : surname).padEnd(39, '<').slice(0, 39)}`
})

const mrzLine2 = computed(() => {
  const num = `TPL${String(passport.visitCount).padStart(5, '0')}`
  const dob = String(issueYear % 100).padStart(2, '0') + '0101'
  const pct = String(overallPct.value).padStart(3, '0')
  return `${num}0CAN${dob}0M260101${pct}PCT`.padEnd(44, '<').slice(0, 44)
})
</script>

<style scoped>
.passport-card {
  position: relative;
  margin: 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  border-left: 1px solid var(--tpl-blue);
  border-right: 1px solid var(--tpl-blue);
}

.card-top {
  background: var(--tpl-blue);
  padding: 12px 18px 10px;
}

.library-name {
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.card-body {
  background: var(--color-bg);
  padding: 14px 18px 14px;
}

.profile-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.profile-fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--tpl-blue);
}

.avatar {
  width: 64px;
  height: 78px;
  border-radius: 6px;
  border: 2px solid var(--tpl-blue);
  background: color-mix(in srgb, var(--tpl-blue) 12%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-letter {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--tpl-blue);
  font-optical-sizing: auto;
}

.field-label {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 2px;
}

.name-input {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-brand-text);
  line-height: 1.1;
  font-optical-sizing: auto;
  background: none;
  border: none;
  border-bottom: 1.5px solid var(--color-border-soft);
  outline: none;
  padding: 0 0 1px;
  width: 100%;
  min-width: 0;
}

.name-input::placeholder {
  color: var(--color-text-muted);
  font-weight: 400;
}

.name-input:focus {
  border-bottom-color: var(--tpl-blue);
}

.name-input:read-only {
  border-bottom-color: transparent;
  cursor: default;
}

.combobox-wrap {
  border-bottom: 1px solid var(--color-border-soft);
}

.combobox-wrap:focus-within {
  border-bottom-color: var(--tpl-blue);
}

.combobox-wrap :deep(.combo__input--inline) {
  font-size: 0.875rem;
  color: var(--tpl-blue);
}

.progress-track {
  height: 4px;
  background: var(--color-border-soft);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--tpl-blue);
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 2px;
}

.stats-row {
  display: flex;
  align-items: center;
}

.stat {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding-right: 8px;
  margin-right: 8px;
  border-right: 1px solid var(--color-border-soft);
}

/* Last .stat is 2nd-to-last child — 3rd child is .count-chip */
.stat:nth-last-child(2) {
  border-right: none;
}

.stat-num {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--tpl-blue);
  font-optical-sizing: auto;
}

.stat-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.count-chip {
  margin-left: auto;
  background: var(--color-border-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.count-chip__num {
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-brand-text);
  font-optical-sizing: auto;
}

.count-chip__denom {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.mrz {
  background: var(--tpl-blue);
  padding: 8px 18px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.mrz-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mrz-line {
  font-family: 'Courier New', monospace;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.28);
  white-space: nowrap;
  overflow: hidden;
}

.mrz-issued {
  display: flex;
  align-items: baseline;
  gap: 5px;
  flex-shrink: 0;
}

.mrz-issued__label {
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.28);
}

.mrz-issued__year {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.58);
  font-optical-sizing: auto;
  line-height: 1;
}

/* Dark mode: bars go darker so white text stays readable against the lighter --tpl-blue */
@media (prefers-color-scheme: dark) {
  .card-top, .mrz { background: #1e3570; }
  .passport-card { border-color: #1e3570; }
}
:global([data-theme="dark"]) .card-top,
:global([data-theme="dark"]) .mrz { background: #1e3570; }
:global([data-theme="dark"]) .passport-card { border-color: #1e3570; }
</style>
