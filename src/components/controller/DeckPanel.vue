<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { DeckId } from '../../commands/DJCommand'
import TempoSlider from '../deck/TempoSlider.vue'
import TransportControls from '../deck/TransportControls.vue'
import HotCuePads from '../deck/HotCuePads.vue'
import LoopControls from '../deck/LoopControls.vue'
import DeckStatus from '../display/DeckStatus.vue'
import Waveform from '../display/Waveform.vue'
import { useCommandBus } from '../../io/keys'
import { useDeckStore } from '../../state/deck.store'

const props = defineProps<{
  deckId: DeckId
}>()

const commandBus = useCommandBus()
const deckStore = useDeckStore()
const { deck1, deck2, focusedDeck } = storeToRefs(deckStore)
const loadError = ref<string | null>(null)
const loading = ref(false)

const deck = computed(() => {
  switch (props.deckId) {
    case 1:
      return deck1.value
    case 2:
      return deck2.value
    default: {
      const neverDeck: never = props.deckId
      throw new Error(`Unknown deck: ${String(neverDeck)}`)
    }
  }
})

const focused = computed(() => focusedDeck.value === props.deckId)

async function onFileChange(event: Event): Promise<void> {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) {
    return
  }
  const file = input.files?.[0]
  if (!file) {
    return
  }
  loading.value = true
  loadError.value = null
  try {
    await commandBus.dispatch({ type: 'DECK_LOAD', deck: props.deckId, file })
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to decode audio file'
  } finally {
    loading.value = false
  }
}

async function togglePlay(): Promise<void> {
  await commandBus.dispatch({ type: 'DECK_TOGGLE_PLAY', deck: props.deckId })
}

async function cuePress(): Promise<void> {
  await commandBus.dispatch({ type: 'DECK_CUE', deck: props.deckId })
}

async function cueRelease(): Promise<void> {
  await commandBus.dispatch({ type: 'DECK_CUE_RELEASE', deck: props.deckId })
}

async function seek(position: number): Promise<void> {
  await commandBus.dispatch({ type: 'DECK_SEEK', deck: props.deckId, position })
}

async function onSlider(event: Event): Promise<void> {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  await seek(Number(target.value))
}
</script>

<template>
  <section
    :data-testid="`deck-${deckId}`"
    class="rounded-xl border bg-panel p-6 shadow-xl"
    :class="focused ? 'border-accent ring-2 ring-accent/40' : 'border-panel-border'"
    @pointerdown="deckStore.focusDeck(deckId)"
  >
    <div class="flex flex-wrap items-center justify-between gap-4">
      <DeckStatus
        :deck-id="deckId"
        :track-title="deck.trackTitle"
        :position-seconds="deck.positionSeconds"
        :duration-seconds="deck.durationSeconds"
        :cue-point="deck.cuePoint"
        :playing="deck.playing"
        :original-bpm="deck.originalBpm"
        :effective-bpm="deck.effectiveBpm"
        :analysis-status="deck.analysisStatus"
        :focused="focused"
      />
      <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-panel-border px-4 py-2 text-sm">
        <span>{{ loading ? 'Decoding…' : 'Load track' }}</span>
        <input
          data-testid="load-input"
          class="sr-only"
          type="file"
          accept="audio/*"
          :disabled="loading"
          @change="onFileChange"
        />
      </label>
    </div>

    <p v-if="loadError" class="mt-3 text-sm text-danger" data-testid="load-error">
      {{ loadError }}
    </p>

    <div class="mt-6 flex gap-4">
      <div class="min-w-0 flex-1">
        <Waveform
          :peaks="deck.waveformPeaks"
          :position-seconds="deck.positionSeconds"
          :duration-seconds="deck.durationSeconds"
          :cue-point="deck.cuePoint"
          :hot-cues="deck.hotCues"
          :active-loop="deck.activeLoop"
          @seek="seek"
        />
        <input
          data-testid="seek-slider"
          class="mt-3 w-full accent-cue"
          type="range"
          min="0"
          :max="deck.durationSeconds || 0"
          step="0.01"
          :value="deck.positionSeconds"
          :disabled="deck.durationSeconds <= 0"
          aria-label="Seek"
          @input="onSlider"
        />
      </div>
      <TempoSlider
        :deck-id="deckId"
        :percent="deck.tempoPercent"
        :range="deck.tempoRange"
        :pitch-bend="deck.pitchBend"
        :master-tempo="deck.masterTempo"
        :master-deck="deck.masterDeck"
        :sync-enabled="deck.syncEnabled"
      />
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-4">
        <TransportControls
          :playing="deck.playing"
          :disabled="deck.durationSeconds <= 0 || loading"
          @toggle-play="togglePlay"
          @cue-press="cuePress"
          @cue-release="cueRelease"
        />
        <HotCuePads
          :deck-id="deckId"
          :hot-cues="deck.hotCues"
          :quantize-enabled="deck.quantizeEnabled"
          :disabled="deck.durationSeconds <= 0 || loading"
        />
        <LoopControls
          :deck-id="deckId"
          :loop-in-seconds="deck.loopInSeconds"
          :active-loop="deck.activeLoop"
          :disabled="deck.durationSeconds <= 0 || loading"
        />
      </div>
      <p class="text-xs text-muted">
        {{ focused ? 'Keyboard target' : 'Click to focus' }}
      </p>
    </div>
  </section>
</template>
