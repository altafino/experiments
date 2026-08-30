<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import TransportControls from '../deck/TransportControls.vue'
import DeckStatus from '../display/DeckStatus.vue'
import Waveform from '../display/Waveform.vue'
import { useCommandBus } from '../../io/keys'
import { useDeckStore } from '../../state/deck.store'

const commandBus = useCommandBus()

const deckStore = useDeckStore()
const { deck } = storeToRefs(deckStore)
const loadError = ref<string | null>(null)
const loading = ref(false)

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
    await commandBus.dispatch({ type: 'DECK_LOAD', deck: 1, file })
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to decode audio file'
  } finally {
    loading.value = false
  }
}

async function togglePlay(): Promise<void> {
  await commandBus.dispatch({ type: 'DECK_TOGGLE_PLAY', deck: 1 })
}

async function cue(): Promise<void> {
  await commandBus.dispatch({ type: 'DECK_CUE', deck: 1 })
}

async function seek(position: number): Promise<void> {
  await commandBus.dispatch({ type: 'DECK_SEEK', deck: 1, position })
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
  <section class="rounded-xl border border-panel-border bg-panel p-6 shadow-xl">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <DeckStatus
        :track-title="deck.trackTitle"
        :position-seconds="deck.positionSeconds"
        :duration-seconds="deck.durationSeconds"
        :cue-point="deck.cuePoint"
        :playing="deck.playing"
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

    <div class="mt-6">
      <Waveform
        :peaks="deck.waveformPeaks"
        :position-seconds="deck.positionSeconds"
        :duration-seconds="deck.durationSeconds"
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

    <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
      <TransportControls
        :playing="deck.playing"
        :disabled="deck.durationSeconds <= 0 || loading"
        @toggle-play="togglePlay"
        @cue="cue"
      />
      <p class="text-xs text-muted">
        Space play/pause · C cue · ← → seek 1s
      </p>
    </div>
  </section>
</template>
