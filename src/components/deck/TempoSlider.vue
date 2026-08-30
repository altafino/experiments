<script setup lang="ts">
import type { DeckId } from '../../commands/DJCommand'
import {
  formatTempoPercent,
  TEMPO_RANGES,
  tempoRangeLabel,
  tempoRangeTestId,
  type PitchBend,
  type TempoRange,
} from '../../domain/tempo'
import { useCommandBus } from '../../io/keys'

const props = defineProps<{
  deckId: DeckId
  percent: number
  range: TempoRange
  pitchBend: PitchBend
  masterTempo: boolean
  masterDeck: boolean
  syncEnabled: boolean
}>()

const commandBus = useCommandBus()

async function setPercent(percent: number): Promise<void> {
  await commandBus.dispatch({ type: 'SET_TEMPO', deck: props.deckId, percent })
}

async function setRange(range: TempoRange): Promise<void> {
  await commandBus.dispatch({ type: 'SET_TEMPO_RANGE', deck: props.deckId, range })
}

async function onSlider(event: Event): Promise<void> {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  await setPercent(Number(target.value))
}

async function startBend(direction: Exclude<PitchBend, 0>, event: PointerEvent): Promise<void> {
  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    target.setPointerCapture(event.pointerId)
  }
  await commandBus.dispatch({ type: 'PITCH_BEND_START', deck: props.deckId, direction })
}

async function endBend(): Promise<void> {
  await commandBus.dispatch({ type: 'PITCH_BEND_END', deck: props.deckId })
}

async function toggleMasterTempo(): Promise<void> {
  await commandBus.dispatch({
    type: 'SET_MASTER_TEMPO',
    deck: props.deckId,
    enabled: !props.masterTempo,
  })
}

async function setMasterDeck(): Promise<void> {
  await commandBus.dispatch({ type: 'SET_MASTER_DECK', deck: props.deckId })
}

async function toggleSync(): Promise<void> {
  await commandBus.dispatch({
    type: 'SET_SYNC',
    deck: props.deckId,
    enabled: !props.syncEnabled,
  })
}
</script>

<template>
  <div class="flex flex-col items-center gap-2" data-testid="tempo">
    <p class="font-mono text-xs text-accent" data-testid="tempo-percent">
      {{ formatTempoPercent(percent) }}
    </p>
    <label class="flex flex-col items-center gap-1 text-[10px] tracking-wider text-muted uppercase">
      Tempo
      <input
        data-testid="tempo-slider"
        class="fader-vertical accent-accent"
        type="range"
        :min="-range"
        :max="range"
        step="0.01"
        :value="percent"
        aria-label="Tempo"
        @input="onSlider"
        @dblclick.prevent="setPercent(0)"
      />
    </label>
    <div class="grid grid-cols-2 gap-1">
      <button
        v-for="option in TEMPO_RANGES"
        :key="option"
        type="button"
        :data-testid="tempoRangeTestId(option)"
        class="rounded px-1.5 py-0.5 text-[9px] tracking-wide uppercase"
        :class="
          range === option ? 'bg-accent text-surface' : 'border border-panel-border text-muted'
        "
        @click="setRange(option)"
      >
        {{ tempoRangeLabel(option) }}
      </button>
    </div>
    <button
      type="button"
      data-testid="master-tempo"
      class="rounded px-2 py-1 text-[9px] tracking-wide uppercase"
      :class="masterTempo ? 'bg-accent text-surface' : 'border border-panel-border text-muted'"
      :aria-pressed="masterTempo"
      @click="toggleMasterTempo"
    >
      MT
    </button>
    <div class="flex gap-1">
      <button
        type="button"
        data-testid="deck-master"
        class="rounded px-2 py-1 text-[9px] tracking-wide uppercase"
        :class="masterDeck ? 'bg-accent text-surface' : 'border border-panel-border text-muted'"
        :aria-pressed="masterDeck"
        @click="setMasterDeck"
      >
        MASTER
      </button>
      <button
        type="button"
        data-testid="sync"
        class="rounded px-2 py-1 text-[9px] tracking-wide uppercase"
        :class="syncEnabled ? 'bg-accent text-surface' : 'border border-panel-border text-muted'"
        :aria-pressed="syncEnabled"
        :disabled="masterDeck"
        @click="toggleSync"
      >
        SYNC
      </button>
    </div>
    <div class="flex gap-1">
      <button
        type="button"
        data-testid="pitch-bend-down"
        class="rounded px-2 py-1 font-mono text-xs"
        :class="pitchBend < 0 ? 'bg-accent text-surface' : 'border border-panel-border text-muted'"
        aria-label="Pitch bend down"
        @pointerdown.prevent="startBend(-1, $event)"
        @pointerup.prevent="endBend"
        @pointercancel.prevent="endBend"
      >
        −
      </button>
      <button
        type="button"
        data-testid="pitch-bend-up"
        class="rounded px-2 py-1 font-mono text-xs"
        :class="pitchBend > 0 ? 'bg-accent text-surface' : 'border border-panel-border text-muted'"
        aria-label="Pitch bend up"
        @pointerdown.prevent="startBend(1, $event)"
        @pointerup.prevent="endBend"
        @pointercancel.prevent="endBend"
      >
        +
      </button>
    </div>
  </div>
</template>
