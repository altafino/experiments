<script setup lang="ts">
defineProps<{
  playing: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  togglePlay: []
  cuePress: []
  cueRelease: []
}>()

function startCue(event: PointerEvent): void {
  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    target.setPointerCapture(event.pointerId)
  }
  emit('cuePress')
}
</script>

<template>
  <div class="flex gap-2" data-testid="transport" @pointerdown.stop>
    <button
      type="button"
      data-testid="play-pause"
      class="min-h-11 min-w-11 rounded-sm bg-accent px-4 text-sm font-medium text-surface disabled:opacity-40"
      :disabled="disabled"
      @click="emit('togglePlay')"
    >
      {{ playing ? 'Pause' : 'Play' }}
    </button>
    <button
      type="button"
      data-testid="cue"
      class="min-h-11 min-w-11 rounded-sm bg-cue px-4 text-sm font-medium text-surface disabled:opacity-40"
      :disabled="disabled"
      @pointerdown.prevent="startCue"
      @pointerup.prevent="emit('cueRelease')"
      @pointercancel.prevent="emit('cueRelease')"
    >
      Cue
    </button>
  </div>
</template>
