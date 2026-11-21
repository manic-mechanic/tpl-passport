<template>
  <!-- An empty, un-inked stamp with a locate crosshair: the "find my branch"
       prompt shown before we know where the user is. -->
  <div class="locate-stamp" :class="{ busy }" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
    <div class="locate-stamp-ring" />
    <svg class="locate-stamp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.75" stroke-linecap="round"
         :style="{ width: `${Math.round(size * 0.36)}px`, height: `${Math.round(size * 0.36)}px` }"
    >
      <circle cx="12" cy="12" r="3.25" /><circle cx="12" cy="12" r="7.5" />
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
    </svg>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: number
  busy?: boolean
}>(), {
  size: 100,
  busy: false,
})
</script>

<style scoped>
.locate-stamp {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2.5px dashed color-mix(in srgb, var(--tpl-blue) 45%, transparent);
  border-radius: 14px;
  color: var(--tpl-blue);
  background: color-mix(in srgb, var(--tpl-blue) 4%, transparent);
  transform: rotate(-4deg);
}

.locate-stamp-ring {
  position: absolute;
  inset: 6px;
  border: 1.5px dashed color-mix(in srgb, var(--tpl-blue) 22%, transparent);
  border-radius: 9px;
}

.locate-stamp-icon {
  position: relative;
}

/* Searching: the crosshair pulses like it's homing in */
.locate-stamp.busy .locate-stamp-icon {
  animation: locate-pulse 1.1s ease-in-out infinite;
}

@keyframes locate-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.82); opacity: 0.55; }
}

@media (prefers-reduced-motion: reduce) {
  .locate-stamp.busy .locate-stamp-icon {
    animation: none;
    opacity: 0.6;
  }
}
</style>
