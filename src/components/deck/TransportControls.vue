<script setup lang="ts">
defineProps<{
  playing: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  togglePlay: []
  cue: []
}>()
</script>

<template>
  <div class="flex gap-3">
    <button
      type="button"
      data-testid="play-pause"
      class="rounded-md bg-accent px-5 py-2 font-semibold text-surface disabled:opacity-40"
      :disabled="disabled"
      @click="emit('togglePlay')"
    >
      {{ playing ? 'Pause' : 'Play' }}
    </button>
    <button
      type="button"
      data-testid="cue"
      class="rounded-md bg-cue px-5 py-2 font-semibold text-surface disabled:opacity-40"
      :disabled="disabled"
      @click="emit('cue')"
    >
      Cue
    </button>
  </div>
</template>
