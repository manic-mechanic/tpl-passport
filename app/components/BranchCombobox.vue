<template>
  <div class="combo" ref="comboRef">
    <input
      v-bind="$attrs"
      ref="inputRef"
      type="text"
      class="combo__input"
      :class="{ 'combo__input--inline': variant === 'inline' }"
      :value="displayValue"
      :placeholder="placeholder"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.enter.prevent="confirmFocused"
      @keydown.escape="close"
      @keydown.arrow-down.prevent="moveFocus(1)"
      @keydown.arrow-up.prevent="moveFocus(-1)"
      autocomplete="off"
    />
    <Teleport to="body">
      <ul v-if="open" class="combo-list" :style="listStyle">
        <li v-if="modelValue" class="combo-item combo-clear" @mousedown.prevent="select('')">
          Clear selection
        </li>
        <li
          v-for="(b, i) in filtered"
          :key="b.BranchCode"
          class="combo-item"
          :class="{ 'combo-item--hi': i === focusedIdx }"
          @mousedown.prevent="select(b.BranchCode)"
        >{{ b.BranchName }}</li>
        <li v-if="!filtered.length" class="combo-none">No matches</li>
      </ul>
    </Teleport>
  </div>
</template>

<script setup>
import { sortedBranches } from '~/composables/useRegion'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Search branches…' },
  variant: { type: String, default: 'field' }, // 'field' | 'inline'
})
const emit = defineEmits(['update:modelValue'])

const comboRef  = ref(null)
const query     = ref('')
const open      = ref(false)
const focusedIdx = ref(-1)
const listStyle  = ref({})

const selectedLabel = computed(() =>
  sortedBranches.find(b => b.BranchCode === props.modelValue)?.BranchName ?? ''
)

const displayValue = computed(() => open.value ? query.value : selectedLabel.value)

const filtered = computed(() => {
  const q = query.value.toLowerCase()
  return q ? sortedBranches.filter(b => b.BranchName.toLowerCase().includes(q)) : sortedBranches
})

function onFocus() {
  const rect = comboRef.value.getBoundingClientRect()
  listStyle.value = {
    position: 'fixed',
    top:   `${rect.bottom + 4}px`,
    left:  `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: 999,
  }
  query.value = ''
  open.value = true
  focusedIdx.value = -1
}

function onInput(e) {
  query.value = e.target.value
  focusedIdx.value = -1
}

function onBlur() {
  setTimeout(close, 150)
}

function close() {
  open.value = false
  query.value = ''
  focusedIdx.value = -1
}

function moveFocus(dir) {
  focusedIdx.value = Math.max(-1, Math.min(filtered.value.length - 1, focusedIdx.value + dir))
}

function confirmFocused() {
  if (focusedIdx.value >= 0) select(filtered.value[focusedIdx.value].BranchCode)
}

function select(code) {
  emit('update:modelValue', code)
  close()
}
</script>

<style scoped>
.combo {
  position: relative;
}

.combo__input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  box-shadow: var(--shadow-sm);
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.combo__input:focus {
  border-color: var(--tpl-blue);
}

.combo__input--inline {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
  font-weight: 600;
}

.combo__input--inline::placeholder {
  color: var(--color-border);
}
</style>

<style>
.combo-list {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: var(--shadow-md);
  padding: 4px;
  margin: 0;
}

.combo-item {
  padding: 10px 12px;
  font-size: 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text);
}

.combo-item:hover,
.combo-item--hi {
  background: color-mix(in srgb, var(--tpl-blue) 10%, var(--color-surface));
  color: var(--tpl-blue);
}

.combo-clear {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border-soft);
  margin-bottom: 2px;
  border-radius: 0;
}

.combo-none {
  padding: 10px 12px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  pointer-events: none;
}
</style>
