<template>
  <main class="page-content">
    <header class="page-header">
      <div>
        <h1>Your Passport</h1>
        <p class="sub">{{ passport.visitCount }} of {{ physicalBranches.length }} stamps collected</p>
      </div>
    </header>

    <div v-for="region in REGION_ORDER" :key="region" class="region-section">
      <p class="section-label">{{ region }}</p>
      <div class="stamp-grid">
        <NuxtLink
          v-for="branch in byRegion[region] ?? []"
          :key="branch.BranchCode"
          :to="`/branch/${branch.BranchCode}`"
          class="stamp-slot"
          :class="{ 'stamp-slot--collected': passport.hasVisited(branch.BranchCode) }"
        >
          <div class="stamp-shape" :style="stampStyle(branch)">
            <div class="stamp-ring" :style="{ borderRadius: stampShape(branch) }" />
            <span class="stamp-code">{{ branch.BranchCode }}</span>
          </div>
          <span class="stamp-name">{{ branch.BranchName }}</span>
          <span v-if="passport.hasVisited(branch.BranchCode)" class="stamp-date">
            {{ visitDate(branch.BranchCode) }}
          </span>
          <span v-else class="stamp-unseen">not yet</span>
        </NuxtLink>
      </div>
    </div>

  </main>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { useStampColor, getStampShape } from '~/composables/useStampColor'
import { physicalBranches, REGION_ORDER, getRegion } from '~/composables/useRegion'

const passport = usePassportStore()

const byRegion = computed(() => {
  const map = {}
  for (const region of REGION_ORDER) map[region] = []
  for (const b of physicalBranches) {
    const region = getRegion(b.WardNo)
    if (region) map[region].push(b)
  }
  return map
})

function stampStyle(branch) {
  const shape = getStampShape(branch.BranchCode)
  if (passport.hasVisited(branch.BranchCode)) {
    const { color, bg, border } = useStampColor(branch.WardNo)
    return { color, background: bg, borderColor: border, borderRadius: shape }
  }
  return {
    color: 'var(--color-border)',
    background: 'transparent',
    borderColor: 'var(--color-border)',
    borderRadius: shape,
  }
}

function stampShape(branch) {
  return getStampShape(branch.BranchCode)
}

function visitDate(branchCode) {
  const c = passport.checkIns.find(x => x.branchCode === branchCode)
  if (!c) return ''
  return new Date(c.timestamp).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.page-header {
  padding: 20px 0 18px;
}

.page-header h1 { margin-bottom: 4px; }

.sub {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* Dashed separators between regions — passport page feel */
.region-section {
  padding-bottom: 24px;
  border-bottom: 1.5px dashed var(--color-border);
}

.region-section + .region-section {
  padding-top: 20px;
}

.region-section:last-child {
  border-bottom: none;
}

.stamp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 10px;
}

.stamp-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  color: var(--color-text);
}

/* Shape container — all shapes live within this fixed bounding box */
.stamp-shape {
  width: 76px;
  height: 76px;
  border: 2.5px solid currentColor;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
}

.stamp-slot--collected .stamp-shape {
  box-shadow: 0 2px 10px color-mix(in srgb, currentColor 25%, transparent);
}

.stamp-slot--collected .stamp-shape:active {
  transform: scale(0.94) rotate(-2deg);
}

.stamp-ring {
  position: absolute;
  inset: 5px;
  border: 1.5px dashed currentColor;
  opacity: 0.4;
}

.stamp-slot--collected .stamp-ring {
  border-style: solid;
  opacity: 0.3;
}

.stamp-code {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-optical-sizing: auto;
  position: relative;
  z-index: 1;
}

.stamp-name {
  font-size: 0.6rem;
  font-weight: 600;
  text-align: center;
  color: var(--color-text-mid);
  line-height: 1.3;
  max-width: 80px;
}

.stamp-slot:not(.stamp-slot--collected) .stamp-name {
  color: var(--color-text-muted);
}

.stamp-date {
  font-size: 0.58rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.stamp-unseen {
  font-size: 0.55rem;
  color: var(--color-border);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
