<template>
  <!-- Stamp border + inner ring + code text (or slotted content for special cases) -->
  <!-- Width/height/border-radius all set inline via stampStyles.                    -->
  <!-- CSS var --stamp-rotate lets parents override the press animation correctly.   -->
  <div class="stamp-shape" :style="shapeStyle">
    <div class="stamp-ring" :style="{ borderRadius: dims.ringBr, inset: `${dims.ringInset}px` }" />
    <slot>
      <span class="stamp-code" :style="{ fontFamily: font, fontSize: codeFontSize, opacity: inkOpacity }">
        {{ branchCode }}
      </span>
    </slot>
  </div>
</template>

<script setup>
import { getStampColor, getStampShape, getStampFont, getStampRotation, getStampOpacity } from '~/composables/useStamp'

const props = defineProps({
  branchCode: { type: String, required: true },
  wardNo:     { type: [Number, String], required: true },
  // If provided, overrides the natural shape dimensions with a fixed square of this px size
  size:       { type: Number, default: null },
})

const shape      = computed(() => getStampShape(props.branchCode))
const font       = computed(() => getStampFont(props.branchCode))
const rotation   = computed(() => getStampRotation(props.branchCode))
const inkOpacity = computed(() => getStampOpacity(props.branchCode))

// Proportional scaling — same logic as RN StampShape.
// size prop scales relative to the larger dimension, preserving aspect ratio.
const dims = computed(() => {
  const shapeW = parseInt(shape.value.width)
  const shapeH = parseInt(shape.value.height)
  const scale = props.size != null ? props.size / Math.max(shapeW, shapeH) : 1
  const w = Math.round(shapeW * scale)
  const h = Math.round(shapeH * scale)
  const isPercent = shape.value.borderRadius.includes('%')
  // Keep % as-is (CSS resolves to correct ellipse); scale px values
  const borderRadius = isPercent
    ? shape.value.borderRadius
    : `${Math.min(Math.round(parseInt(shape.value.borderRadius) * scale), Math.min(w, h) / 2)}px`
  // Inner ring inset: 6px on full-size stamps, thinner on small ones so it
  // doesn't swallow the space the initials need.
  const ringInset = Math.max(2, Math.min(6, Math.round(Math.min(w, h) * 0.12)))
  // Ring border-radius tracks outer minus the inset
  const outerBrPx = isPercent ? Math.min(w, h) / 2 : Math.round(parseInt(shape.value.borderRadius) * scale)
  const ringBr = `${Math.max(0, Math.min(outerBrPx, Math.min(w, h) / 2) - ringInset)}px`
  return { w, h, borderRadius, ringBr, ringInset }
})

// Initials are limited by whichever is tighter: the stamp's height or its
// width per character. Square stamps come out at 30% of their side as before;
// wide ovals and pills (much shorter than they are wide) get larger initials
// instead of being sized off their short side, which made them unreadable
// at list sizes.
const codeFontSize = computed(() => {
  const { w, h } = dims.value
  const charsFactor = Math.max(1, props.branchCode.length / 3)
  const byHeight = h * 0.45
  const byWidth = (w * 0.30) / charsFactor
  return `${Math.round(Math.min(byHeight, byWidth))}px`
})

const shapeStyle = computed(() => {
  const { color, bg, border } = getStampColor(props.wardNo)
  const { w, h, borderRadius } = dims.value
  return {
    borderRadius,
    width:  `${w}px`,
    height: `${h}px`,
    color,
    background: bg,
    borderColor: border,
    '--stamp-rotate': `${rotation.value}deg`,
  }
})
</script>

<style scoped>
.stamp-shape {
  border: 2.5px solid currentColor;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transform: rotate(var(--stamp-rotate, 0deg));
  transition: transform 0.15s ease;
  box-shadow: 0 2px 12px color-mix(in srgb, currentColor 22%, transparent);
}

/* Inner impression ring — mimics a real rubber stamp */
.stamp-ring {
  position: absolute;
  border: 1.5px solid currentColor;
  opacity: 0.22;
}

.stamp-code {
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
}
</style>
