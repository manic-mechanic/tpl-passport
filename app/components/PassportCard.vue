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
                   autocomplete="given-name" :readonly="isSignedIn"
            />
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
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="64" height="78">
            <mask id="avatar-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
              <rect width="36" height="36" fill="#FFFFFF" />
            </mask>
            <g mask="url(#avatar-mask)">
              <rect width="36" height="36" :fill="avatarData.backgroundColor" />
              <rect x="0" y="0" width="36" height="36"
                    :transform="`translate(${avatarData.wrapperTranslateX} ${avatarData.wrapperTranslateY}) rotate(${avatarData.wrapperRotate} 18 18) scale(${avatarData.wrapperScale})`"
                    :fill="avatarData.wrapperColor"
                    :rx="avatarData.isCircle ? 36 : 6"
              />
              <g :transform="`translate(${avatarData.faceTranslateX} ${avatarData.faceTranslateY}) rotate(${avatarData.faceRotate} 18 18)`">
                <path v-if="avatarData.isMouthOpen"
                      :d="`M15 ${19 + avatarData.mouthSpread}c2 1 4 1 6 0`"
                      :stroke="avatarData.faceColor" fill="none" stroke-linecap="round"
                />
                <path v-else
                      :d="`M13,${19 + avatarData.mouthSpread} a1,0.75 0 0,0 10,0`"
                      :fill="avatarData.faceColor"
                />
                <rect :x="14 - avatarData.eyeSpread" y="14" width="1.5" height="2" rx="1" :fill="avatarData.faceColor" />
                <rect :x="20 + avatarData.eyeSpread" y="14" width="1.5" height="2" rx="1" :fill="avatarData.faceColor" />
              </g>
            </g>
          </svg>
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

// boring-avatars beam algorithm (inlined — package utilities not exported at runtime)
function _hash(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) { h = Math.imul(h, 31) + name.charCodeAt(i) | 0 }
  return Math.abs(h)
}
function _unit(n, range, idx) {
  const v = n % range
  return idx !== undefined && Math.floor(n / 10 ** idx) % 10 % 2 === 0 ? -v : v
}
function _color(n, colors) { return colors[n % colors.length] }
function _bool(n, idx) { return Math.floor(n / 10 ** idx) % 10 % 2 === 0 }
function _contrast(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000000' : '#ffffff'
}

function branchNameForCode(code) {
  return physicalBranches.find(b => b.BranchCode === code)?.BranchName ?? code
}

const AVATAR_COLORS = [
  '#005fc0', // TPL blue
  '#001c71', // TPL navy
  '#1a6b4a', // forest green
  '#6b3fa0', // purple
  '#0d7a8a', // teal
  '#c45520', // burnt orange
  '#8b4513', // terracotta
  '#f5d6db', // light rose   (stamp hue 350, 90% l)
  '#d6f5ed', // light mint   (stamp hue 165, 90% l)
  '#e8d8f5', // light lavender (stamp hue 275, 90% l)
]
const S = 36

function getBeamData(name) {
  const n = _hash(name || 'TPL Passport')
  const wrapperColor = _color(n, AVATAR_COLORS)
  const wx = _unit(n, 10, 1)
  const wy = _unit(n, 10, 2)
  const wrapperTranslateX = wx < 5 ? wx + S / 9 : wx
  const wrapperTranslateY = wy < 5 ? wy + S / 9 : wy
  return {
    backgroundColor: _color(n + 13, AVATAR_COLORS),
    wrapperColor,
    faceColor: _contrast(wrapperColor),
    wrapperTranslateX,
    wrapperTranslateY,
    wrapperRotate: _unit(n, 360),
    wrapperScale: 1 + _unit(n, S / 12) / 10,
    isMouthOpen: _bool(n, 2),
    isCircle: _bool(n, 1),
    eyeSpread: _unit(n, 5),
    mouthSpread: _unit(n, 3),
    faceRotate: _unit(n, 10, 3),
    faceTranslateX: wrapperTranslateX > S / 6 ? wrapperTranslateX / 2 : _unit(n, 8, 1),
    faceTranslateY: wrapperTranslateY > S / 6 ? wrapperTranslateY / 2 : _unit(n, 7, 2),
  }
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

const avatarData = computed(() => {
  const seed = [passport.profile.name?.trim(), passport.profile.homeBranch].filter(Boolean).join('|')
  return getBeamData(seed)
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
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid var(--color-border);
  padding: 3px;

  & svg {
    display: block;
    width: 100%;
    height: 100%;
  }
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

</style>
