<script setup lang="ts">
import type { DeckId } from '../../commands/DJCommand'
import {
  COLOR_FX_TYPES,
  colorFxLabel,
  colorFxTestId,
  type ColorFxType,
} from '../../domain/colorFx'
import type { ChannelMixState, EqBand } from '../../domain/MixerState'
import { MIXER_DEFAULTS } from '../../domain/MixerState'
import { useCommandBus } from '../../io/keys'
import { DECK_THEMES } from '../display/deckTheme'
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

async function setColor(value: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_COLOR', deck: props.deckId, value })
}

async function setColorFx(fx: ColorFxType): Promise<void> {
  await commandBus.dispatch({ type: 'SET_COLOR_FX', deck: props.deckId, fx })
}

async function setFader(value: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_CHANNEL_FADER', deck: props.deckId, value })
}

async function toggleCue(): Promise<void> {
  await commandBus.dispatch({
    type: 'SET_CHANNEL_CUE',
    deck: props.deckId,
    enabled: !props.channel.cue,
  })
}
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <p class="text-xs tracking-[0.2em] uppercase" :style="{ color: DECK_THEMES[deckId].text }">
      Ch {{ deckId }}
    </p>
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
        label="Color"
        :test-id="`channel-${deckId}-color`"
        :value="channel.color"
        :reset-value="MIXER_DEFAULTS.color"
        @change="setColor"
      />
      <MixerFader
        label="Fader"
        :test-id="`channel-${deckId}-fader`"
        :value="channel.fader"
        :reset-value="MIXER_DEFAULTS.fader"
        @change="setFader"
      />
    </div>
    <div class="flex max-w-[14rem] flex-wrap justify-center gap-1">
      <button
        v-for="fx in COLOR_FX_TYPES"
        :key="fx"
        type="button"
        :data-testid="`channel-${deckId}-${colorFxTestId(fx)}`"
        class="rounded px-1.5 py-0.5 text-[9px] tracking-wide uppercase"
        :class="
          channel.colorFx === fx
            ? 'bg-accent text-surface'
            : 'border border-panel-border text-muted'
        "
        :aria-pressed="channel.colorFx === fx"
        @click="setColorFx(fx)"
      >
        {{ colorFxLabel(fx) }}
      </button>
    </div>
    <button
      type="button"
      :data-testid="`channel-${deckId}-cue`"
      class="rounded px-3 py-0.5 text-[9px] tracking-wide uppercase"
      :class="
        channel.cue ? 'bg-accent text-surface' : 'border border-panel-border text-muted'
      "
      :aria-pressed="channel.cue"
      @click="toggleCue"
    >
      Cue
    </button>
  </div>
</template>
