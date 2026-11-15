<template>
  <main class="error-page">
    <BrandMark />

    <div class="error-card card">
      <p class="error-code">{{ isNotFound ? '404' : 'Error' }}</p>
      <h1 class="error-title">{{ isNotFound ? 'Page not found' : 'Something went wrong' }}</h1>
      <p class="error-text">
        {{ isNotFound
          ? 'This page isn’t in the passport. It may have moved, or the link may be wrong.'
          : 'An unexpected error stopped this page from loading. Your passport is saved on this device.' }}
      </p>
      <button v-if="isNotFound" type="button" class="btn-primary" @click="goHome">Back to your passport</button>
      <template v-else>
        <button type="button" class="btn-primary" @click="retry">Try again</button>
        <button type="button" class="btn-secondary" @click="goHome">Back to your passport</button>
      </template>
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

// Full reload of the current URL, so a transient failure gets a clean start
// rather than re-rendering the same broken state.
function retry() {
  window.location.reload()
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

.btn-primary,
.btn-secondary {
  width: 100%;
  padding: 16px;
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-body);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.btn-primary {
  color: var(--color-text-inverse);
  background: var(--tpl-blue);
  border: none;
}

.btn-secondary {
  margin-top: 10px;
  color: var(--tpl-blue);
  background: transparent;
  border: 1px solid var(--color-border);
}
</style>
