<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { CrossfaderCurve } from '../../domain/MixerState'
import { MIXER_DEFAULTS } from '../../domain/MixerState'
import { useCommandBus } from '../../io/keys'
import { useMixerStore } from '../../state/mixer.store'
import MixerChannel from './MixerChannel.vue'
import MixerFader from './MixerFader.vue'

const commandBus = useCommandBus()
const mixerStore = useMixerStore()
const { mixer } = storeToRefs(mixerStore)

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
</script>

<template>
  <section
    data-testid="mixer"
    class="flex min-w-[22rem] flex-col gap-5 rounded-xl border border-panel-border bg-panel p-5 shadow-xl"
  >
    <header class="flex items-center justify-between">
      <h2 class="text-xs tracking-[0.2em] text-muted uppercase">Mixer</h2>
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
  </section>
</template>
