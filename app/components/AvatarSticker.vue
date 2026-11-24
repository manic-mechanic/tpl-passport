<template>
  <svg class="avatar-sticker" viewBox="0 0 100 120" :width="size" :height="Math.round(size * 1.2)" aria-hidden="true"
       :style="{ borderRadius: `${radius}px` }"
  >
    <rect width="100" height="120" :fill="bg" />
    <path v-if="look.back" :d="look.back" :fill="look.backFill" />
    <path d="M12 120 C15 94 33 86 50 86 C67 86 85 94 88 120 Z" :fill="shirt" />
    <rect x="44" y="70" width="12" height="18" rx="4" :fill="skin" />
    <ellipse cx="50" cy="52" :rx="look.faceRx" :ry="look.faceRy" :fill="skin" />
    <path :d="look.front" :fill="look.frontFill" />
    <path v-if="look.beard" :d="look.beard" :fill="hair" />
    <circle cx="42" cy="66" r="4" fill="#e8796b" opacity="0.28" />
    <circle cx="58" cy="66" r="4" fill="#e8796b" opacity="0.28" />
    <circle cx="43" cy="56" r="2.1" fill="#1d1a17" />
    <circle cx="57" cy="56" r="2.1" fill="#1d1a17" />
    <path v-if="look.glasses" :d="look.glasses" fill="none" stroke="#1d1a17" stroke-width="1.6" />
    <path :d="look.mouth" fill="none" stroke="#1d1a17" stroke-width="1.8" stroke-linecap="round" />
    <path v-if="look.extra" :d="look.extra" :fill="look.extraFill" />
  </svg>
</template>

<script setup lang="ts">
// An illustrated person: one of six looks, with skin, hair, shirt and
// background colours. Decoration for now (onboarding panels and the street
// scene); the avatar builder (#83, PR 2) will let people make their own.

const props = withDefaults(defineProps<{
  kind?: number
  skin?: string
  hair?: string
  bg?: string
  shirt?: string
  accent?: string
  size?: number
  radius?: number
}>(), {
  kind: 0,
  skin: '#c98e63',
  hair: '#2b1d14',
  bg: '#f6d9a8',
  shirt: '#005fc0',
  accent: '#c43c4e',
  size: 120,
  radius: 10,
})

const look = computed(() => {
  const { hair, accent } = props
  const v = {
    faceRx: 19, faceRy: 22,
    back: '', backFill: hair, front: '', frontFill: hair, beard: '', glasses: '', extra: '', extraFill: accent,
    mouth: 'M44 66 Q50 71 56 66',
  }
  switch (props.kind) {
    case 0: // curly
      v.back = 'M24 60 C14 44 22 24 36 22 C40 12 60 10 66 20 C80 20 88 40 76 60 C80 44 70 34 50 34 C32 34 22 44 24 60 Z'
      v.front = 'M31 46 C30 34 40 28 50 30 C60 28 70 34 69 46 C64 38 58 36 50 37 C42 36 36 38 31 46 Z'
      break
    case 1: // short, glasses
      v.front = 'M31 48 C29 30 40 24 52 24 C64 24 72 32 69 48 C66 37 58 34 50 35 C41 35 34 39 31 48 Z'
      v.glasses = 'M36.5 56 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M51.5 56 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M48.5 55 L51.5 55'
      break
    case 2: // beanie
      v.front = 'M29 46 C29 26 40 18 50 18 C60 18 71 26 71 46 Z'
      v.frontFill = accent
      v.extra = 'M28 42 H72 V49 H28 Z M45 15 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0'
      v.extraFill = '#f2ede3'
      break
    case 3: // headscarf
      v.back = 'M25 58 C23 32 36 20 50 20 C64 20 77 32 75 58 C75 74 66 88 50 90 C34 88 25 74 25 58 Z'
      v.backFill = accent
      v.faceRx = 16
      v.faceRy = 19
      v.front = 'M33 44 C36 34 44 31 50 31 C56 31 64 34 67 44 C62 38 56 37 50 37 C44 37 38 38 33 44 Z'
      v.frontFill = accent
      break
    case 4: // bun
      v.back = 'M40 18 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0'
      v.front = 'M31 50 C30 33 40 27 50 27 C60 27 70 33 69 50 C66 40 58 36 50 36 C42 36 34 40 31 50 Z'
      break
    default: // beard
      v.front = 'M32 46 C31 32 41 27 50 27 C59 27 69 32 68 46 C64 39 57 36 50 36 C43 36 36 39 32 46 Z'
      v.beard = 'M31 56 C32 74 41 82 50 82 C59 82 68 74 69 56 C64 66 57 69 50 69 C43 69 36 66 31 56 Z'
      v.mouth = 'M45 69 Q50 72 55 69'
  }
  return v
})
</script>

<style scoped>
.avatar-sticker {
  display: block;
  flex-shrink: 0;
}
</style>
