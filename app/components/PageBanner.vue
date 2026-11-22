<template>
  <div class="page-banner" :class="{ 'page-banner--attached': !!$slots.default, 'page-banner--sub': !!backLabel }">
    <header class="page-banner__bar">
      <NuxtLink v-if="backLabel && backTo" :to="backTo" class="page-banner__back">
        <IconBack />
        {{ backLabel }}
      </NuxtLink>
      <button v-else-if="backLabel" type="button" class="page-banner__back" @click="emit('back')">
        <IconBack />
        {{ backLabel }}
      </button>
      <div class="page-banner__row">
        <h1 class="page-banner__title">
          <slot name="title">{{ title }}</slot>
        </h1>
        <div v-if="$slots.action" class="page-banner__action">
          <slot name="action" />
        </div>
      </div>
      <p v-if="$slots.sub" class="page-banner__sub">
        <slot name="sub" />
      </p>
    </header>
    <!-- Anything that should stick with the banner, e.g. a tab bar -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import IconBack from '~/components/icons/IconBack.vue'

// The navy header at the top of a page. Every page uses this, so the banner
// height and the title's position stay the same as you move between pages.
// Top-level pages get a title (and maybe an action); pages reached from
// another page also get a back link above a smaller title, which leaves room
// for long names like tour routes.
defineProps<{
  title?: string
  backLabel?: string
  // Where the back link goes. Without it, the link emits `back` instead.
  backTo?: string
}>()

const emit = defineEmits<{ back: [] }>()
</script>

<style scoped>
.page-banner {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 10;
  /* Bleed past .page-content's side padding to the screen edges */
  margin: 0 -18px;
  background: var(--tpl-navy);
  /* The same gap above every page's content */
  margin-bottom: var(--banner-gap);
}

/* A tab bar inside the banner sits flush on the content below it */
.page-banner--attached {
  margin-bottom: 0;
}

.page-banner__bar {
  padding: var(--banner-pad-top) 18px var(--banner-pad-bottom);
}

.page-banner__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: var(--banner-back-height);
  padding: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.72);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;

  & svg {
    width: 16px;
    height: 16px;
  }
}

.page-banner__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: var(--banner-row-height);
}

.page-banner__title {
  min-width: 0;
  font-size: 2rem;
  line-height: 1.15;
  color: rgba(255, 255, 255, 0.92);
  overflow-wrap: anywhere;
  /* Even out two-line titles, so one word isn't left on a line by itself */
  text-wrap: balance;
}

.page-banner--sub .page-banner__title {
  font-size: 1.5rem;
  line-height: 1.2;
}

.page-banner__action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.page-banner__sub {
  margin-top: 2px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6);

  & :deep(strong) {
    color: rgba(255, 255, 255, 0.85);
    font-weight: 600;
  }
}
</style>
