<script setup lang="ts">
import {
  BEAT_FX_LENGTHS,
  BEAT_FX_TYPES,
  beatFxLabel,
  beatFxLengthLabel,
  beatFxLengthTestId,
  beatFxTestId,
  type BeatFxLength,
  type BeatFxType,
} from '../../domain/beatFx'
import { MIXER_DEFAULTS } from '../../domain/MixerState'
import { useCommandBus } from '../../io/keys'
import MixerFader from './MixerFader.vue'

const props = defineProps<{
  fx: BeatFxType
  beats: BeatFxLength
  level: number
  enabled: boolean
  bpm: number
}>()

const commandBus = useCommandBus()

async function setFx(next: BeatFxType): Promise<void> {
  await commandBus.dispatch({ type: 'SET_BEAT_FX', fx: next })
}

async function setBeats(beats: BeatFxLength): Promise<void> {
  await commandBus.dispatch({ type: 'SET_BEAT_FX_BEAT', beats })
}

async function setLevel(value: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_BEAT_FX_LEVEL', value })
}

async function toggleEnabled(): Promise<void> {
  await commandBus.dispatch({ type: 'SET_BEAT_FX_ENABLED', enabled: !props.enabled })
}
</script>

<template>
  <div data-testid="beat-fx" class="flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <p class="text-[10px] tracking-[0.2em] text-muted uppercase">Beat FX</p>
      <p class="font-mono text-[10px] text-muted" data-testid="beat-fx-bpm">
        {{ bpm.toFixed(1) }} BPM
      </p>
    </div>
    <div class="flex flex-wrap gap-1">
      <button
        v-for="type in BEAT_FX_TYPES"
        :key="type"
        type="button"
        :data-testid="beatFxTestId(type)"
        class="rounded px-1.5 py-0.5 text-[9px] tracking-wide uppercase"
        :class="
          fx === type ? 'bg-accent text-surface' : 'border border-panel-border text-muted'
        "
        :aria-pressed="fx === type"
        @click="setFx(type)"
      >
        {{ beatFxLabel(type) }}
      </button>
      <button
        type="button"
        data-testid="beat-fx-on"
        class="ml-auto rounded px-2 py-0.5 text-[9px] tracking-wide uppercase"
        :class="enabled ? 'bg-accent text-surface' : 'border border-panel-border text-muted'"
        :aria-pressed="enabled"
        @click="toggleEnabled"
      >
        On
      </button>
    </div>
    <div class="flex flex-wrap gap-1">
      <button
        v-for="length in BEAT_FX_LENGTHS"
        :key="length"
        type="button"
        :data-testid="beatFxLengthTestId(length)"
        class="rounded px-1.5 py-0.5 text-[9px] tracking-wide uppercase"
        :class="
          beats === length ? 'bg-accent text-surface' : 'border border-panel-border text-muted'
        "
        :aria-pressed="beats === length"
        @click="setBeats(length)"
      >
        {{ beatFxLengthLabel(length) }}
      </button>
    </div>
    <MixerFader
      label="Level"
      test-id="beat-fx-level"
      :value="level"
      :reset-value="MIXER_DEFAULTS.beatFxLevel"
      orientation="horizontal"
      @change="setLevel"
    />
  </div>
</template>
