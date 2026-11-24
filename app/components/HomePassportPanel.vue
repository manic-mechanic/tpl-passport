<template>
  <section v-if="variant === 'large'" class="passport-panel" aria-labelledby="home-passport-title">
    <div class="panel-art" aria-hidden="true">
      <div class="blank-passport blank-passport--large">
        <div class="blank-band" />
        <div class="blank-body">
          <div class="blank-photo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
            </svg>
          </div>
          <div class="blank-lines"><span /><span /><span /></div>
        </div>
      </div>
      <div v-for="s in STICKERS" :key="s.kind" class="sticker" :class="`sticker--${s.kind}`">
        <AvatarSticker v-bind="s" :radius="s.size / 2" />
      </div>
    </div>
    <h2 id="home-passport-title" class="panel-title">Make your passport</h2>
    <p class="panel-sub">Add your name and home branch.</p>
    <NuxtLink to="/make-passport" class="panel-btn" @click="emit('tap')">Start</NuxtLink>
  </section>

  <NuxtLink v-else to="/make-passport" class="passport-row" :class="`passport-row--${variant}`" @click="emit('tap')">
    <span class="row-art" aria-hidden="true">
      <span class="blank-passport blank-passport--small">
        <span class="blank-band" />
        <span class="blank-photo" />
      </span>
      <span class="sticker sticker--row">
        <AvatarSticker v-bind="STICKERS[0]" :size="variant === 'row' ? 44 : 54" :radius="variant === 'row' ? 22 : 27" />
      </span>
    </span>
    <span class="row-text">
      <span class="row-title">Make your passport</span>
      <span class="row-sub">Add your name and home branch.</span>
    </span>
    <IconChevron class="row-chevron" aria-hidden="true" />
  </NuxtLink>
</template>

<script setup lang="ts">
import IconChevron from '~/components/icons/IconChevron.vue'

// Home's "Make your passport" panel for people who haven't made one yet:
//   large  the top two thirds of a first-visit Home
//   small  the bottom third of a first-visit Home
//   row    under the passport card, after the first check-in
withDefaults(defineProps<{
  variant?: 'large' | 'small' | 'row'
}>(), {
  variant: 'large',
})
const emit = defineEmits<{ tap: [] }>()

const STICKERS = [
  { kind: 4, skin: '#e0a982', hair: '#6b4a2e', bg: '#ffd76a', shirt: '#c94a32', size: 62 },
  { kind: 3, skin: '#8d5a3b', hair: '#1d140f', bg: '#cfe3c0', shirt: '#005fc0', accent: '#7a3ec4', size: 56 },
  { kind: 5, skin: '#5c3a26', hair: '#151010', bg: '#f3c9cf', shirt: '#1a7a3c', size: 50 },
] as const
</script>

<style scoped>
.passport-panel {
  display: flex;
  flex-direction: column;
  padding: 18px;
  border-radius: var(--radius-lg);
  background-color: var(--color-paper);
  background-image: repeating-radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--tpl-blue) 7%, transparent) 0 1px, transparent 1px 9px);
  border: 1px solid var(--color-border-soft);
  box-shadow: 0 6px 18px rgba(0, 28, 113, 0.1);
}

.panel-art {
  position: relative;
  flex: 1 1 auto;
  min-height: 170px;
}

.blank-passport {
  display: block;
  overflow: hidden;
  background: var(--tpl-blue);
  box-shadow: 0 14px 26px -10px rgba(0, 28, 113, 0.5);
}

.blank-band {
  display: block;
  background: var(--tpl-navy);
}

.blank-passport--large {
  position: absolute;
  left: 6%;
  top: 14px;
  width: 64%;
  max-width: 230px;
  aspect-ratio: 23 / 15;
  border-radius: var(--radius);
  transform: rotate(-5deg);

  & .blank-band {
    height: 16%;
  }
}

.blank-body {
  display: flex;
  gap: 12px;
  padding: 12px;
}

.blank-photo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30%;
  aspect-ratio: 31 / 38;
  border-radius: 6px;
  border: 2px dashed rgba(255, 255, 255, 0.65);
  color: rgba(255, 255, 255, 0.8);

  & svg {
    width: 40%;
  }
}

.blank-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;

  & span {
    height: 7px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.35);

    &:first-child {
      background: rgba(255, 255, 255, 0.55);
    }

    &:nth-child(2) {
      width: 70%;
    }

    &:nth-child(3) {
      width: 50%;
    }
  }
}

.sticker {
  position: absolute;
  padding: 3px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
  line-height: 0;
}

.sticker--4 {
  right: 2%;
  top: 0;
  transform: rotate(8deg);
}

.sticker--3 {
  right: 10%;
  top: 44%;
  transform: rotate(-6deg);
}

.sticker--5 {
  right: 32%;
  bottom: 0;
  transform: rotate(4deg);
}

.panel-title {
  margin-top: 12px;
  font-family: var(--font-display);
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--color-brand-text);
  font-optical-sizing: auto;
}

.panel-sub {
  margin-top: 8px;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: var(--color-text-mid);
}

.panel-btn {
  margin-top: 16px;
  display: block;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  text-align: center;
  text-decoration: none;
  font-size: 1.0625rem;
  font-weight: 700;
  box-shadow: var(--shadow-accent);
  transition: transform 0.1s;

  &:active {
    transform: scale(0.98);
  }
}

/* Small and row: one tappable card */
.passport-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 16px 16px 12px;
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--color-text);
  transition: transform 0.1s;

  &:active {
    transform: scale(0.98);
  }
}

.passport-row--small {
  background-color: var(--color-paper);
  background-image: repeating-radial-gradient(circle at 0% 100%, color-mix(in srgb, var(--tpl-blue) 7%, transparent) 0 1px, transparent 1px 9px);
  border: 1px solid var(--color-border-soft);
  box-shadow: 0 4px 14px rgba(0, 28, 113, 0.08);
}

.passport-row--row {
  padding: 14px 16px 14px 12px;
  background: var(--color-surface);
  border: 2px solid var(--tpl-blue);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--tpl-blue) 16%, transparent);
}

.row-art {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 104px;
}

.passport-row--row .row-art {
  width: 100px;
  height: 84px;
}

.blank-passport--small {
  position: absolute;
  left: 0;
  top: 12px;
  width: 80%;
  aspect-ratio: 124 / 86;
  border-radius: 10px;
  transform: rotate(-6deg);

  & .blank-band {
    height: 16%;
  }

  & .blank-photo {
    margin: 8px;
    width: 28%;
  }
}

.sticker--row {
  right: 0;
  bottom: 0;
  transform: rotate(6deg);
}

.row-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row-title {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--color-brand-text);
  font-optical-sizing: auto;
}

.row-sub {
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--color-text-mid);
}

.row-chevron {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: var(--tpl-blue);
}
</style>
