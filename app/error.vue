<template>
  <main class="error-page">
    <div class="brand">
      <img src="/tpl-meta.png" class="tpl-logo" alt="Toronto Public Library" />
      <span class="brand-title">passport<span class="brand-colon">:</span></span>
    </div>

    <div class="error-card card">
      <p class="error-code">{{ isNotFound ? '404' : 'Error' }}</p>
      <h1 class="error-title">{{ isNotFound ? 'Page not found' : 'Something went wrong' }}</h1>
      <p class="error-text">
        {{ isNotFound
          ? 'This page isn’t in the passport. It may have moved, or the link may be wrong.'
          : 'An unexpected error stopped this page from loading. Your passport is saved on this device.' }}
      </p>
      <button type="button" class="btn-primary" @click="goHome">Back to your passport</button>
    </div>
  </main>
</template>

<script setup>
const props = defineProps({
  error: { type: Object, required: true },
})

const isNotFound = computed(() => props.error?.status === 404)

useHead({ title: () => `${isNotFound.value ? 'Page not found' : 'Error'} · Library Passport` })

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<style scoped>
.error-page {
  min-height: 100svh;
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 16px;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
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
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-brand-text);
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
}

.brand-colon {
  color: var(--tpl-blue);
}

.error-card {
  padding: 24px 20px;
}

.error-code {
  font-family: var(--font-stamp);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.error-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.error-text {
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-text-mid);
  margin-bottom: 20px;
}

.btn-primary {
  width: 100%;
  padding: 16px;
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-body);
  color: var(--color-text-inverse);
  background: var(--tpl-blue);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
</style>
