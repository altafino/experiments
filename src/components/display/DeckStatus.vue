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
  <div class="flex min-w-0 items-end justify-between gap-2">
    <div class="min-w-0">
      <p class="text-[10px] tracking-[0.2em] uppercase" :class="focused ? 'text-accent' : 'text-muted'">
        Deck {{ deckId }}
      </p>
      <p class="mt-0.5 truncate text-sm font-medium text-ink" data-testid="track-title">
        {{ trackTitle ?? 'No track loaded' }}
      </p>
      <p class="mt-0.5 font-mono text-[12px] text-accent" data-testid="bpm">
        {{ bpmLabel() }}
      </p>
      <p
        v-if="originalBpm !== undefined && effectiveBpm !== undefined && originalBpm !== effectiveBpm"
        class="font-mono text-[10px] text-muted"
        data-testid="original-bpm"
      >
        {{ originalBpm.toFixed(2) }} orig
      </p>
      <p v-if="slipActive" class="text-[10px] text-accent" data-testid="logical-position">
        Slip {{ formatTimecode(logicalPositionSeconds ?? positionSeconds) }}
      </p>
    </div>
    <div class="shrink-0 text-right font-mono">
      <p class="text-lg text-accent" data-testid="position">
        {{ formatTimecode(positionSeconds) }}
      </p>
      <p class="text-[11px] text-muted" data-testid="remaining">
        {{ formatTimecode(Math.max(0, durationSeconds - positionSeconds), true) }}
      </p>
    </div>
  </div>
</template>
