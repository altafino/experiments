<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    testId: string
    value: number
    min?: number
    max?: number
    step?: number
    resetValue: number
    orientation?: 'vertical' | 'horizontal'
  }>(),
  {
    min: 0,
    max: 1,
    step: 0.01,
    orientation: 'vertical',
  },
)

const emit = defineEmits<{
  change: [value: number]
}>()

function onInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  emit('change', Number(target.value))
}

function reset(): void {
  emit('change', props.resetValue)
}
</script>

<template>
  <label class="flex flex-col items-center gap-1 text-[10px] tracking-wider text-muted uppercase">
    {{ label }}
    <input
      :data-testid="testId"
      :class="orientation === 'vertical' ? 'fader-vertical accent-accent' : 'w-full accent-accent'"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="value"
      :aria-label="label"
      @input="onInput"
      @dblclick.prevent="reset"
    />
  </label>
</template>
