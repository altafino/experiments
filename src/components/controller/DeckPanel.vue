<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { DeckId } from '../../commands/DJCommand'
import PadBank from '../deck/PadBank.vue'
import TempoSlider from '../deck/TempoSlider.vue'
import TransportControls from '../deck/TransportControls.vue'
import JogWheel from '../deck/JogWheel.vue'
import DeckStatus from '../display/DeckStatus.vue'
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
const loadInput = ref<HTMLInputElement | null>(null)

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
const hasTrack = computed(() => deck.value.durationSeconds > 0)
const padsDisabled = computed(() => !hasTrack.value || loading.value)

async function loadFile(file: File): Promise<void> {
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

async function onFileChange(event: Event): Promise<void> {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) {
    return
  }
  const file = input.files?.[0]
  if (!file) {
    return
  }
  await loadFile(file)
  input.value = ''
}

function openLoad(): void {
  loadInput.value?.click()
}

async function togglePlay(): Promise<void> {
  await commandBus.dispatch({ type: 'DECK_TOGGLE_PLAY', deck: props.deckId })
  deckStore.focusDeck(props.deckId)
}

async function cuePress(): Promise<void> {
  deckStore.focusDeck(props.deckId)
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
    class="deck-panel flex flex-col gap-2 border bg-panel p-2"
    :class="focused ? 'border-accent' : 'border-panel-border'"
    :aria-label="`Deck ${deckId}`"
    role="region"
    @pointerdown="deckStore.focusDeck(deckId)"
  >
    <input
      ref="loadInput"
      data-testid="load-input"
      class="sr-only"
      type="file"
      accept="audio/*"
      :disabled="loading"
      @change="onFileChange"
    />
    <input
      data-testid="seek-slider"
      class="sr-only"
      type="range"
      min="0"
      :max="deck.durationSeconds || 0"
      step="0.01"
      :value="deck.positionSeconds"
      :disabled="deck.durationSeconds <= 0"
      aria-label="Seek"
      @input="onSlider"
    />

    <div
      class="flex min-h-0 flex-1 gap-2"
      :class="deckId === 1 ? 'flex-row' : 'flex-row-reverse'"
    >
      <TempoSlider
        class="deck-tempo shrink-0"
        :deck-id="deckId"
        :percent="deck.tempoPercent"
        :range="deck.tempoRange"
        :pitch-bend="deck.pitchBend"
        :master-tempo="deck.masterTempo"
        :master-deck="deck.masterDeck"
        :sync-enabled="deck.syncEnabled"
        :slip-enabled="deck.slipEnabled"
      />
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <div class="deck-peer-row flex min-h-11 items-center gap-2">
          <div class="deck-strip-bar min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <p class="min-w-0 flex-1 truncate text-[11px] tracking-[0.12em] text-ink uppercase" data-testid="strip-title">
              {{ deck.trackTitle ?? 'No track' }}
            </p>
            <p class="shrink-0 font-mono text-[11px] text-accent" data-testid="strip-bpm">
              {{ (deck.effectiveBpm ?? deck.originalBpm)?.toFixed(2) ?? '—' }}
            </p>
          </div>
          <div class="deck-bezel min-w-0 flex-1">
            <DeckStatus
              :deck-id="deckId"
              :track-title="deck.trackTitle"
              :position-seconds="deck.positionSeconds"
              :duration-seconds="deck.durationSeconds"
              :cue-point="deck.cuePoint"
              :playing="deck.playing"
              :slip-active="deck.slipActive"
              :logical-position-seconds="deck.logicalPositionSeconds"
              :original-bpm="deck.originalBpm"
              :effective-bpm="deck.effectiveBpm"
              :analysis-status="deck.analysisStatus"
              :focused="focused"
            />
          </div>
          <TransportControls
            class="deck-transport shrink-0"
            :playing="deck.playing"
            :disabled="padsDisabled"
            @toggle-play="togglePlay"
            @cue-press="cuePress"
            @cue-release="cueRelease"
          />
        </div>
        <div class="deck-hands flex min-h-0 flex-1 flex-col items-center justify-between gap-2">
          <PadBank
            :deck-id="deckId"
            :hot-cues="deck.hotCues"
            :quantize-enabled="deck.quantizeEnabled"
            :loop-in-seconds="deck.loopInSeconds"
            :active-loop="deck.activeLoop"
            :disabled="padsDisabled"
          />
          <JogWheel
            :deck-id="deckId"
            :vinyl-mode="deck.vinylMode"
            :jog-velocity="deck.jogVelocity"
            :empty="!hasTrack"
            :loading="loading"
            :error="loadError"
            :scratch-disabled="padsDisabled"
            @load-request="openLoad"
            @drop-file="loadFile"
          />
        </div>
      </div>
    </div>
  </section>
</template>
