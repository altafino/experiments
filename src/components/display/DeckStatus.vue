<script setup lang="ts">
import { formatTimecode } from '../../domain/timecode'

defineProps<{
  trackTitle?: string
  positionSeconds: number
  durationSeconds: number
  cuePoint?: number
  playing: boolean
}>()
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="text-xs tracking-[0.2em] text-muted uppercase">Deck 1</p>
      <h2 class="mt-1 text-lg font-semibold text-ink" data-testid="track-title">
        {{ trackTitle ?? 'No track loaded' }}
      </h2>
      <p class="mt-1 text-sm text-muted">
        {{ playing ? 'Playing' : 'Paused' }}
        <span class="text-cue"> · Cue {{ formatTimecode(cuePoint ?? 0) }}</span>
      </p>
    </div>
    <div class="font-mono text-right">
      <p class="text-2xl text-accent" data-testid="position">
        {{ formatTimecode(positionSeconds) }}
      </p>
      <p class="text-sm text-muted" data-testid="remaining">
        {{ formatTimecode(Math.max(0, durationSeconds - positionSeconds), true) }}
        <span class="text-muted"> / {{ formatTimecode(durationSeconds) }}</span>
      </p>
    </div>
  </div>
</template>
