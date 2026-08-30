<script setup lang="ts">
import type { DeckId } from '../../commands/DJCommand'
import type { AnalysisStatus } from '../../domain/Track'
import { formatTimecode } from '../../domain/timecode'

const props = defineProps<{
  deckId: DeckId
  trackTitle?: string
  positionSeconds: number
  durationSeconds: number
  cuePoint?: number
  playing: boolean
  focused: boolean
  slipActive?: boolean
  logicalPositionSeconds?: number
  originalBpm?: number
  effectiveBpm?: number
  analysisStatus: AnalysisStatus
}>()

function bpmLabel(): string {
  switch (props.analysisStatus) {
    case 'pending':
      return 'Analyzing…'
    case 'failed':
      return 'Analysis failed'
    case 'ready':
      return props.effectiveBpm !== undefined
        ? `${props.effectiveBpm.toFixed(2)} BPM`
        : props.originalBpm !== undefined
          ? `${props.originalBpm.toFixed(2)} BPM`
          : '— BPM'
    case 'idle':
      return '— BPM'
    default: {
      const neverStatus: never = props.analysisStatus
      return String(neverStatus)
    }
  }
}
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="text-xs tracking-[0.2em] uppercase" :class="focused ? 'text-accent' : 'text-muted'">
        Deck {{ deckId }}
      </p>
      <h2 class="mt-1 text-lg font-semibold text-ink" data-testid="track-title">
        {{ trackTitle ?? 'No track loaded' }}
      </h2>
      <p class="mt-1 text-sm text-muted">
        {{ playing ? 'Playing' : 'Paused' }}
        <span class="text-cue"> · Cue {{ formatTimecode(cuePoint ?? 0) }}</span>
        <span v-if="slipActive" class="text-accent" data-testid="logical-position">
          · Slip {{ formatTimecode(logicalPositionSeconds ?? positionSeconds) }}
        </span>
      </p>
      <p class="mt-1 font-mono text-sm text-accent" data-testid="bpm">
        {{ bpmLabel() }}
      </p>
      <p
        v-if="originalBpm !== undefined && effectiveBpm !== undefined && originalBpm !== effectiveBpm"
        class="mt-0.5 font-mono text-[11px] text-muted"
        data-testid="original-bpm"
      >
        {{ originalBpm.toFixed(2) }} orig
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
