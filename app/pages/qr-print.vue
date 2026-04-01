<template>
  <main class="page-content">
    <header class="page-header">
      <NuxtLink to="/settings" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Settings
      </NuxtLink>
      <h1 class="page-title">QR Codes</h1>
    </header>

    <p class="intro">
      Print these QR codes and post them at each branch. Scanning takes visitors
      directly to the check-in screen for that location.
    </p>

    <!-- Search -->
    <div class="search-wrap">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        v-model="query"
        type="search"
        class="search-input"
        placeholder="Search branches…"
      />
    </div>

    <!-- QR grid -->
    <div class="qr-grid">
      <div
        v-for="branch in filteredBranches"
        :key="branch.BranchCode"
        class="qr-card"
      >
        <img
          :src="qrUrl(branch.BranchCode)"
          :alt="`QR code for ${branch.BranchName}`"
          class="qr-img"
          loading="lazy"
        />
        <div class="qr-info">
          <p class="qr-name">{{ branch.BranchName }}</p>
          <p class="qr-code">{{ branch.BranchCode }}</p>
          <p class="qr-url">passport/check-in?branch={{ branch.BranchCode }}</p>
        </div>
      </div>
    </div>

    <p v-if="filteredBranches.length === 0" class="empty-state">
      No branches match "{{ query }}"
    </p>
  </main>
</template>

<script setup>
import { physicalBranches } from '~/composables/useRegion'

const query = ref('')

const filteredBranches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return physicalBranches
  return physicalBranches.filter(b =>
    b.BranchName.toLowerCase().includes(q) ||
    b.BranchCode.toLowerCase().includes(q)
  )
})

// Check-in URL encoded into the QR code
function checkinUrl(branchCode) {
  return `${window.location.origin}/check-in?branch=${branchCode}`
}

// QR image via qrserver.com — free, no API key, widely used
function qrUrl(branchCode) {
  const data = encodeURIComponent(checkinUrl(branchCode))
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${data}`
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0 14px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tpl-blue);
  text-decoration: none;
  flex-shrink: 0;
}

.back-link svg { width: 16px; height: 16px; }

.page-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-body);
}

.intro {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-bottom: 16px;
}

/* Search */
.search-wrap {
  position: relative;
  margin-bottom: 18px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  font-size: 1rem;
  font-family: var(--font-body);
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  color: var(--color-text);
  outline: none;
  box-shadow: var(--shadow-sm);
}

.search-input::placeholder { color: var(--color-text-muted); }

/* QR grid — two columns */
.qr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.qr-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-shadow: var(--shadow-sm);
}

.qr-img {
  width: 100%;
  max-width: 140px;
  aspect-ratio: 1;
  border-radius: 6px;
  display: block;
}

.qr-info {
  width: 100%;
  text-align: center;
}

.qr-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
}

.qr-code {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--tpl-blue);
  margin-top: 2px;
}

.qr-url {
  font-size: 0.5rem;
  color: var(--color-text-muted);
  margin-top: 2px;
  font-family: 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
