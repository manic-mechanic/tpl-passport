<template>
  <DrawerRoot :open="open" :no-body-styles="true" @update:open="$emit('update:open', $event)">
    <DrawerPortal>
      <DrawerOverlay class="sheet-overlay" />
      <DrawerContent class="sheet-content" :style="{ height }" :aria-label="ariaLabel">
        <div class="sheet-handle-row">
          <div class="sheet-handle-bar" />
        </div>
        <button class="sheet-close" aria-label="Close" @click="$emit('update:open', false)">
          <IconSheetClose />
        </button>
        <div class="sheet-scroll">
          <slot />
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<script setup>
import { DrawerRoot, DrawerPortal, DrawerOverlay, DrawerContent } from 'vaul-vue'
import IconSheetClose from './icons/IconSheetClose.vue';

defineProps({
  open: { type: Boolean, required: true },
  height: { type: String, default: 'auto' },
  ariaLabel: { type: String, default: '' },
})
defineEmits(['update:open'])
</script>

<style scoped>
/* Overlay and sheet content are teleported to <body>, so they need :global() */
:global(.sheet-overlay) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: var(--nav-height);
  background: rgba(0, 0, 0, 0.42);
  z-index: 90;
}

:global(.sheet-content) {
  position: fixed;
  bottom: var(--nav-height) !important;
  left: 0;
  right: 0;
  margin: 0 auto;
  max-width: 480px;
  background: var(--color-bg) !important;
  border-radius: 20px 20px 0 0;
  z-index: 90;
  overflow: hidden;
  outline: none;
}

/* Handle, close button, and scroll area are in this component's template,
   so scoped styles work even though they're inside the teleported drawer. */
.sheet-handle-row {
  display: flex;
  justify-content: center;
  padding: 14px 0 8px;
}

.sheet-handle-bar {
  width: 36px;
  height: 4px;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 2px;

  @media (prefers-color-scheme: dark) {
    & {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

:global([data-theme="dark"]) .sheet-handle-bar {
  background: rgba(255, 255, 255, 0.2);
}

.sheet-close {
  position: absolute;
  top: 10px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  cursor: pointer;
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
  z-index: 1;

  &:active {
    background: rgba(0, 0, 0, 0.2);
  }

  & svg {
    width: 16px;
    height: 16px;
  }

  @media (prefers-color-scheme: dark) {
    & {
      background: rgba(255, 255, 255, 0.14);
    }

    &:active {
      background: rgba(255, 255, 255, 0.24);
    }
  }
}

:global([data-theme="dark"]) .sheet-close {
  background: rgba(255, 255, 255, 0.14);
}

:global([data-theme="dark"]) .sheet-close:active {
  background: rgba(255, 255, 255, 0.24);
}

.sheet-scroll {
  height: calc(100% - 48px);
  overflow-y: auto;
  padding: 0 20px 32px;
}
</style>
