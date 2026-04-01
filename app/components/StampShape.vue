<template>
  <!-- Stamp border + inner ring + code text (or slotted content for special cases) -->
  <!-- Width/height/border-radius all set inline via stampStyles.                    -->
  <!-- CSS var --stamp-rotate lets parents override the press animation correctly.   -->
  <div class="stamp-shape" :style="shapeStyle">
    <div class="stamp-ring" :style="{ borderRadius: shape.borderRadius }" />
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

// Font size scales with the smaller dimension — keeps text filling the stamp at any size
const codeFontSize = computed(() => {
  if (props.size) return `${Math.round(props.size * 0.30)}px`
  const minDim = Math.min(parseInt(shape.value.width), parseInt(shape.value.height))
  return `${Math.round(minDim * 0.30)}px`
})

const shapeStyle = computed(() => {
  const { color, bg, border } = getStampColor(props.wardNo)
  return {
    borderRadius: shape.value.borderRadius,
    width:  props.size ? `${props.size}px` : shape.value.width,
    height: props.size ? `${props.size}px` : shape.value.height,
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
  inset: 6px;
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
