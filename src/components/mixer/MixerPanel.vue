<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { CrossfaderCurve } from '../../domain/MixerState'
import { MIXER_DEFAULTS } from '../../domain/MixerState'
import { useCommandBus } from '../../io/keys'
import { useMixerStore } from '../../state/mixer.store'
import { useRecordingStore } from '../../state/recording.store'
import BeatFxPanel from './BeatFxPanel.vue'
import MixerChannel from './MixerChannel.vue'
import MixerFader from './MixerFader.vue'

const commandBus = useCommandBus()
const mixerStore = useMixerStore()
const recordingStore = useRecordingStore()
const { mixer } = storeToRefs(mixerStore)
const { recording } = storeToRefs(recordingStore)

const curves: { id: CrossfaderCurve; label: string }[] = [
  { id: 'linear', label: 'Linear' },
  { id: 'equalPower', label: 'Equal' },
  { id: 'sharp', label: 'Sharp' },
]

async function setCrossfader(value: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_CROSSFADER', value })
}

async function setCurve(curve: CrossfaderCurve): Promise<void> {
  await commandBus.dispatch({ type: 'SET_CROSSFADER_CURVE', curve })
}

async function setMaster(value: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_MASTER_GAIN', value })
}

async function setCueMix(value: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_CUE_MIX', value })
}

async function setPhonesLevel(value: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_PHONES_LEVEL', value })
}

async function toggleRecord(): Promise<void> {
  if (recording.value) {
    await commandBus.dispatch({ type: 'RECORD_STOP' })
  } else {
    await commandBus.dispatch({ type: 'RECORD_START' })
  }
}
</script>

<template>
  <section
    data-testid="mixer"
    class="flex min-h-0 flex-col gap-4 border border-panel-border bg-panel p-3"
  >
    <header class="flex items-center justify-between gap-3">
      <h2 class="text-xs tracking-[0.2em] text-muted uppercase">Mixer</h2>
      <div class="flex items-center gap-3">
        <button
          type="button"
          data-testid="record"
          class="rounded px-2 py-0.5 text-[9px] tracking-wide uppercase"
          :class="recording ? 'bg-danger text-surface' : 'border border-panel-border text-muted'"
          :aria-pressed="recording"
          @click="toggleRecord"
        >
          Rec
        </button>
        <div class="w-44">
          <MixerFader
            label="Master"
            test-id="master-gain"
            :value="mixer.masterGain"
            :reset-value="MIXER_DEFAULTS.masterGain"
            orientation="horizontal"
            @change="setMaster"
          />
        </div>
      </div>
    </header>

    <div class="flex justify-between gap-4">
      <MixerChannel :deck-id="1" :channel="mixer.channels[1]" />
      <MixerChannel :deck-id="2" :channel="mixer.channels[2]" />
    </div>

    <div>
      <MixerFader
        label="Crossfader"
        test-id="crossfader"
        :value="mixer.crossfader"
        :reset-value="MIXER_DEFAULTS.crossfader"
        orientation="horizontal"
        @change="setCrossfader"
      />
      <div class="mt-3 flex justify-center gap-2">
        <button
          v-for="curve in curves"
          :key="curve.id"
          type="button"
          :data-testid="`curve-${curve.id}`"
          class="rounded-md px-2 py-1 text-[10px] tracking-wide uppercase"
          :class="
            mixer.crossfaderCurve === curve.id
              ? 'bg-accent text-surface'
              : 'border border-panel-border text-muted'
          "
          @click="setCurve(curve.id)"
        >
          {{ curve.label }}
        </button>
      </div>
    </div>

    <BeatFxPanel
      :fx="mixer.beatFx"
      :beats="mixer.beatFxBeats"
      :level="mixer.beatFxLevel"
      :enabled="mixer.beatFxEnabled"
      :bpm="mixer.beatFxBpm"
    />

    <div class="flex flex-col gap-2">
      <p class="text-[10px] tracking-[0.2em] text-muted uppercase">Phones</p>
      <div class="flex gap-4">
        <MixerFader
          label="Cue Mix"
          test-id="cue-mix"
          :value="mixer.cueMix"
          :reset-value="MIXER_DEFAULTS.cueMix"
          orientation="horizontal"
          @change="setCueMix"
        />
        <MixerFader
          label="Level"
          test-id="phones-level"
          :value="mixer.phonesLevel"
          :reset-value="MIXER_DEFAULTS.phonesLevel"
          orientation="horizontal"
          @change="setPhonesLevel"
        />
      </div>
    </div>
  </section>
</template>
