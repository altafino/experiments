<script setup lang="ts">
import type { DeckId } from '../../commands/DJCommand'
import type { ChannelMixState, EqBand } from '../../domain/MixerState'
import { MIXER_DEFAULTS } from '../../domain/MixerState'
import { useCommandBus } from '../../io/keys'
import MixerFader from './MixerFader.vue'

const props = defineProps<{
  deckId: DeckId
  channel: ChannelMixState
}>()

const commandBus = useCommandBus()

async function setTrim(value: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_TRIM', deck: props.deckId, value })
}

async function setEq(band: EqBand, value: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_EQ', deck: props.deckId, band, value })
}

async function setFader(value: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_CHANNEL_FADER', deck: props.deckId, value })
}
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <p class="text-xs tracking-[0.2em] text-muted uppercase">Ch {{ deckId }}</p>
    <div class="flex items-end gap-3">
      <MixerFader
        label="Trim"
        :test-id="`channel-${deckId}-trim`"
        :value="channel.trim"
        :reset-value="MIXER_DEFAULTS.trim"
        @change="setTrim"
      />
      <MixerFader
        label="Hi"
        :test-id="`channel-${deckId}-eq-high`"
        :value="channel.eq.high"
        :reset-value="MIXER_DEFAULTS.eq"
        @change="(value) => setEq('high', value)"
      />
      <MixerFader
        label="Mid"
        :test-id="`channel-${deckId}-eq-mid`"
        :value="channel.eq.mid"
        :reset-value="MIXER_DEFAULTS.eq"
        @change="(value) => setEq('mid', value)"
      />
      <MixerFader
        label="Low"
        :test-id="`channel-${deckId}-eq-low`"
        :value="channel.eq.low"
        :reset-value="MIXER_DEFAULTS.eq"
        @change="(value) => setEq('low', value)"
      />
      <MixerFader
        label="Fader"
        :test-id="`channel-${deckId}-fader`"
        :value="channel.fader"
        :reset-value="MIXER_DEFAULTS.fader"
        @change="setFader"
      />
    </div>
  </div>
</template>
