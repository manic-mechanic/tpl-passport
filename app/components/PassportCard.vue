<template>
  <section class="passport-card">
    <div class="card-header">
      <div class="header-brand">
        <img src="/tpl-meta-card.png" class="seal" alt="" aria-hidden="true" />
        <p class="wordmark">passport<span class="wordmark-colon">:</span></p>
      </div>
      <p class="library-name">Toronto Public Library</p>
      <NuxtLink to="/settings" class="settings-btn" aria-label="Settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      </NuxtLink>
    </div>

    <div class="card-body">
      <div class="profile-row">
        <div class="profile-fields">
          <div class="name-field">
            <p class="field-label">Name / Nom</p>
            <input v-model="passport.profile.name" class="name-input" type="text"
              placeholder="Your name" maxlength="40" autocomplete="given-name" />
          </div>
          <div class="fields-row">
            <div class="field-col">
              <p class="field-label">Home Branch</p>
              <div class="combobox-wrap">
                <BranchCombobox v-model="passport.profile.homeBranch" variant="inline" placeholder="—" />
              </div>
            </div>
            <div class="field-col">
              <p class="field-label">Favourite Book</p>
              <div class="field-wrap">
                <input v-model="passport.profile.favouriteBook" class="field-input" type="text"
                  placeholder="—" maxlength="80" autocomplete="off" />
              </div>
            </div>
          </div>
        </div>
        <div class="avatar" :style="avatarStyle">
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
import { useStampColor } from '~/composables/useStamp'
import { physicalBranches } from '~/composables/useRegion'

const passport = usePassportStore()
const { progressPct, overallPct } = storeToRefs(passport)

const totalBranches = physicalBranches.length
const issueYear = new Date().getFullYear()

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
  margin-top: 18px;
  margin-bottom: 14px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(0,28,113,0.12);
}

.card-header {
  background: var(--tpl-navy);
  padding: 9px 14px;
  display: flex;
  align-items: center;
  gap: 9px;
}
.header-brand { display: flex; align-items: center; gap: 8px; flex: 1; }
.seal { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; object-fit: contain; opacity: 0.7; }
.wordmark {
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
  margin-top: 1px;
  line-height: 1;
}
.wordmark-colon { color: #6aaaf8; }
.library-name {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.42);
  white-space: nowrap;
}
.settings-btn { flex: 1; display: flex; justify-content: flex-end; background: none; border: none; color: rgba(255,255,255,0.6); }
.settings-btn svg { width: 21px; height: 21px; }

.card-body {
  background: #f4efe4;
  padding: 14px 16px 12px;
  border-top: 1px solid rgba(100,170,248,0.45);
  border-bottom: 1px solid rgba(100,170,248,0.45);
}
.profile-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 11px; }
.profile-fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.avatar {
  width: 72px;
  height: 88px;
  border-radius: 5px;
  border: 2px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.avatar-letter { font-family: var(--font-display); font-size: 1.75rem; font-weight: 700; font-optical-sizing: auto; }

.field-label {
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9a9490;
  margin-bottom: 2px;
}
.name-field { min-width: 0; }
.name-input {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--tpl-navy);
  line-height: 1.1;
  font-optical-sizing: auto;
  background: none;
  border: none;
  border-bottom: 1.5px solid rgba(0,28,113,0.2);
  outline: none;
  padding: 0 0 1px;
  width: 100%;
  min-width: 0;
}
.name-input::placeholder { color: rgba(0,28,113,0.22); font-weight: 400; }
.name-input:focus { border-bottom-color: var(--tpl-blue); }

.fields-row { display: flex; gap: 16px; }
.field-col { min-width: 0; flex: 1; }
.field-input {
  font-size: 1rem;
  font-family: var(--font-body);
  font-weight: 600;
  color: var(--tpl-blue);
  background: none;
  border: none;
  outline: none;
  padding: 0;
  width: 100%;
  min-width: 0;
  display: block;
}
.field-input::placeholder { color: rgba(0,28,113,0.22); font-weight: 400; }
.field-wrap,
.combobox-wrap { border-bottom: 1px solid rgba(0,28,113,0.15); }
.field-wrap:focus-within,
.combobox-wrap:focus-within { border-bottom-color: var(--tpl-blue); }
.combobox-wrap :deep(.combo__input--inline) { font-size: 0.9rem; color: var(--tpl-blue); }

.progress-track { height: 5px; background: rgba(0,28,113,0.14); border-radius: 2px; overflow: hidden; margin-bottom: 11px; }
.progress-fill {
  height: 100%;
  background: var(--tpl-blue);
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 2px;
}

.stats-row { display: flex; align-items: center; }
.stat {
  display: flex;
  align-items: baseline;
  gap: 3px;
  padding-right: 9px;
  margin-right: 9px;
  border-right: 1px solid rgba(0,28,113,0.12);
}
/* Last .stat is 2nd-to-last child — 3rd child is .count-chip */
.stat:nth-last-child(2) { border-right: none; }
.stat-num { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--tpl-blue); font-optical-sizing: auto; }
.stat-label { font-size: 0.62rem; font-weight: 600; color: #9a9490; text-transform: uppercase; letter-spacing: 0.04em; }
.count-chip {
  margin-left: auto;
  background: rgba(0,28,113,0.07);
  border: 1px solid rgba(0,28,113,0.14);
  border-radius: var(--radius-pill);
  padding: 2px 9px;
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.count-chip__num { font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; color: var(--tpl-navy); font-optical-sizing: auto; }
.count-chip__denom { font-size: 0.68rem; color: rgba(0,28,113,0.45); }

.mrz {
  background: var(--tpl-navy);
  padding: 8px 14px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.mrz-lines { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mrz-line {
  font-family: 'Courier New', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: rgba(255,255,255,0.28);
  white-space: nowrap;
  overflow: hidden;
}
.mrz-issued { display: flex; align-items: baseline; gap: 5px; flex-shrink: 0; }
.mrz-issued__label { font-size: 0.62rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(255,255,255,0.28); }
.mrz-issued__year { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: rgba(255,255,255,0.58); font-optical-sizing: auto; line-height: 1; }
</style>
