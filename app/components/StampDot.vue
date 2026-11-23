<template>
  <!-- A branch's stamp in miniature: its shape and ink, filled once visited -->
  <span class="stamp-dot" :class="{ filled: visited }" role="img"
        :aria-label="visited ? 'Visited' : 'Not visited yet'" :style="style"
  />
</template>

<script setup lang="ts">
import { getStampColor, getStampShape, getStampRotation } from '~/composables/useStamp'

const props = withDefaults(defineProps<{
  branchCode: string
  wardNo: number | string | null
  visited: boolean
  size?: number
}>(), { size: 11 })

const style = computed(() => {
  const shape = getStampShape(props.branchCode)!
  const w = parseInt(shape.width)
  const h = parseInt(shape.height)
  const scale = props.size / Math.max(w, h)
  const width = Math.max(6, Math.round(w * scale))
  const height = Math.max(6, Math.round(h * scale))
  const radius = shape.borderRadius.includes('%')
    ? shape.borderRadius
    : `${Math.min(Math.round(parseInt(shape.borderRadius) * scale), Math.min(width, height) / 2)}px`
  return {
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: radius,
    color: getStampColor(props.wardNo ?? 1).color,
    transform: `rotate(${getStampRotation(props.branchCode)}deg)`,
  }
})
</script>

<style scoped>
.stamp-dot {
  display: inline-block;
  flex-shrink: 0;
  box-sizing: border-box;
  border: 1.25px solid currentColor;
  opacity: 0.7;

  &.filled {
    background: currentColor;
    opacity: 1;
  }
}
</style>
