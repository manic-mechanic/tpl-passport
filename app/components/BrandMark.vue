<template>
  <div class="brand">
    <img src="/tpl-meta.png" class="tpl-logo" alt="Toronto Public Library" />
    <span class="brand-title">passport<span class="brand-colon">:</span></span>
  </div>
</template>

<style scoped>
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
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-brand-text);
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
}

.brand-colon {
  color: var(--tpl-blue);
}
</style>
