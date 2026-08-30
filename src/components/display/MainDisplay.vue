<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import type { DeckId } from '../../commands/DJCommand'
import type { DeckState } from '../../domain/DeckState'
import { formatTimecode } from '../../domain/timecode'
import { useCommandBus } from '../../io/keys'
import { useDeckStore } from '../../state/deck.store'
import {
  DISPLAY_MODE_LABELS,
  DISPLAY_MODES,
  useViewStore,
  type DisplayMode,
} from '../../state/view.store'
import MidiPanel from '../controller/MidiPanel.vue'
import { DECK_THEMES } from './deckTheme'
import ScrollingWaveform from './ScrollingWaveform.vue'
import TrackBrowser from './TrackBrowser.vue'

const END_WARNING_SECONDS = 30

const commandBus = useCommandBus()
const deckStore = useDeckStore()
const viewStore = useViewStore()
const { deck1, deck2 } = storeToRefs(deckStore)
const { displayMode, zoomWindow } = storeToRefs(viewStore)

const decks = computed<DeckState[]>(() => [deck1.value, deck2.value])
const performActive = computed(() => displayMode.value === 'performance')

function remainingSeconds(deck: DeckState): number {
  return Math.max(0, deck.durationSeconds - deck.positionSeconds)
}

function endingSoon(deck: DeckState): boolean {
  return deck.durationSeconds > 0 && remainingSeconds(deck) <= END_WARNING_SECONDS
}

function bpmLabel(deck: DeckState): string {
  return (deck.effectiveBpm ?? deck.originalBpm)?.toFixed(2) ?? '—'
}

function tempoLabel(deck: DeckState): string {
  return `${deck.tempoPercent >= 0 ? '+' : ''}${deck.tempoPercent.toFixed(1)}%`
}

function loopLabel(deck: DeckState): string {
  const loop = deck.activeLoop
  if (!loop) {
    return 'off'
  }
  const beats = loop.beats ? `${loop.beats} beat` : 'manual'
  return loop.active ? beats : `${beats} (exited)`
}

async function seek(deck: DeckId, position: number): Promise<void> {
  await commandBus.dispatch({ type: 'DECK_SEEK', deck, position })
}

function setMode(mode: DisplayMode): void {
  viewStore.setDisplayMode(mode)
}
</script>

<template>
  <section
    data-testid="main-display"
    class="lcd-well flex h-full min-h-0 flex-col overflow-hidden border border-panel-border"
  >
    <header
      class="flex flex-wrap items-center justify-between gap-2 border-b border-panel-border px-3 py-1.5"
      role="banner"
    >
      <div class="flex min-w-0 items-center gap-3">
        <h1 class="text-[10px] font-medium tracking-[0.22em] text-muted uppercase">Web DJ</h1>
        <nav class="flex gap-1" aria-label="Display mode">
          <button
            v-for="mode in DISPLAY_MODES"
            :key="mode"
            type="button"
            :data-testid="`display-mode-${mode}`"
            :aria-pressed="displayMode === mode"
            :class="[
              'min-h-11 rounded-sm px-3 text-[10px] tracking-[0.16em] uppercase transition-colors',
              displayMode === mode
                ? 'bg-accent/15 text-accent'
                : 'text-muted hover:bg-panel-border/40 hover:text-ink',
            ]"
            @click="setMode(mode)"
          >
            {{ DISPLAY_MODE_LABELS[mode] }}
          </button>
        </nav>
      </div>
      <div
        v-show="displayMode === 'performance'"
        class="flex items-center gap-1 text-[10px] tracking-[0.12em] text-muted uppercase"
      >
        <span>Zoom</span>
        <button
          type="button"
          data-testid="display-zoom-out"
          aria-label="Zoom out waveform"
          class="min-h-11 min-w-11 rounded-sm border border-panel-border px-2 hover:text-ink"
          @click="viewStore.zoom('out')"
        >
          −
        </button>
        <span data-testid="display-zoom" class="w-8 text-center font-mono text-ink normal-case">
          {{ zoomWindow }}s
        </span>
        <button
          type="button"
          data-testid="display-zoom-in"
          aria-label="Zoom in waveform"
          class="min-h-11 min-w-11 rounded-sm border border-panel-border px-2 hover:text-ink"
          @click="viewStore.zoom('in')"
        >
          +
        </button>
      </div>
    </header>

    <div
      v-show="displayMode === 'performance'"
      class="grid min-h-0 flex-1 grid-cols-2 gap-px bg-panel-border"
    >
      <article
        v-for="deck in decks"
        :key="deck.deckId"
        :data-testid="`main-display-${deck.deckId}`"
        class="flex min-h-0 flex-col bg-[#080d15] px-2 py-1"
      >
        <div class="flex items-baseline justify-between gap-2 text-[11px]">
          <p class="flex min-w-0 items-baseline gap-2">
            <span
              class="shrink-0 tracking-[0.16em] uppercase"
              :style="{ color: DECK_THEMES[deck.deckId].text }"
            >
              Deck {{ deck.deckId }}
            </span>
            <span class="truncate text-sm text-ink">{{ deck.trackTitle ?? 'No track' }}</span>
            <span v-if="deck.analysisStatus === 'pending'" class="shrink-0 text-muted">
              analysing…
            </span>
          </p>
          <p class="flex shrink-0 items-baseline gap-3 font-mono">
            <span class="text-accent">{{ bpmLabel(deck) }} BPM</span>
            <span class="text-muted">{{ tempoLabel(deck) }}</span>
            <span
              :data-testid="`main-display-remaining-${deck.deckId}`"
              :class="endingSoon(deck) ? 'text-danger' : 'text-ink'"
            >
              {{ formatTimecode(remainingSeconds(deck), true) }}
            </span>
          </p>
        </div>
        <ScrollingWaveform
          :test-id="`scrolling-waveform-${deck.deckId}`"
          :theme="DECK_THEMES[deck.deckId]"
          :peaks="deck.waveformPeaks"
          :levels="deck.waveformLevels"
          :beat-grid="deck.beatGrid"
          :position-seconds="deck.positionSeconds"
          :duration-seconds="deck.durationSeconds"
          :window-seconds="zoomWindow"
          :cue-point="deck.cuePoint"
          :hot-cues="deck.hotCues"
          :active-loop="deck.activeLoop"
          :logical-position-seconds="deck.logicalPositionSeconds"
          :display-active="performActive"
          @seek="(position) => seek(deck.deckId, position)"
          @zoom="viewStore.zoom"
        />
      </article>
    </div>

    <div v-show="displayMode === 'browse'" class="min-h-0 flex-1 overflow-auto p-3">
      <TrackBrowser />
    </div>

    <div v-show="displayMode === 'info'" class="grid min-h-0 flex-1 gap-3 overflow-auto p-3 sm:grid-cols-2">
      <dl
        v-for="deck in decks"
        :key="deck.deckId"
        :data-testid="`display-info-${deck.deckId}`"
        class="border border-panel-border bg-surface/60 p-3 text-sm"
      >
        <p
          class="mb-2 text-[10px] tracking-[0.16em] uppercase"
          :style="{ color: DECK_THEMES[deck.deckId].text }"
        >
          Deck {{ deck.deckId }}
        </p>
        <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt class="text-muted">Track</dt>
          <dd class="truncate text-ink">{{ deck.trackTitle ?? '—' }}</dd>
          <dt class="text-muted">Analysis</dt>
          <dd class="text-ink">{{ deck.analysisStatus }}</dd>
          <dt class="text-muted">Original BPM</dt>
          <dd class="font-mono text-ink">{{ deck.originalBpm?.toFixed(2) ?? '—' }}</dd>
          <dt class="text-muted">Playing BPM</dt>
          <dd class="font-mono text-accent">{{ bpmLabel(deck) }}</dd>
          <dt class="text-muted">Tempo</dt>
          <dd class="font-mono text-ink">{{ tempoLabel(deck) }} · ±{{ deck.tempoRange }}%</dd>
          <dt class="text-muted">Key lock</dt>
          <dd class="text-ink">{{ deck.masterTempo ? 'on' : 'off' }}</dd>
          <dt class="text-muted">Sync</dt>
          <dd class="text-ink">
            {{ deck.masterDeck ? 'master' : deck.syncEnabled ? 'on' : 'off' }}
          </dd>
          <dt class="text-muted">Quantize</dt>
          <dd class="text-ink">{{ deck.quantizeEnabled ? 'on' : 'off' }}</dd>
          <dt class="text-muted">Loop</dt>
          <dd class="text-ink">{{ loopLabel(deck) }}</dd>
          <dt class="text-muted">Slip</dt>
          <dd class="text-ink">{{ deck.slipEnabled ? 'on' : 'off' }}</dd>
          <dt class="text-muted">Elapsed</dt>
          <dd class="font-mono text-ink">{{ formatTimecode(deck.positionSeconds) }}</dd>
          <dt class="text-muted">Remaining</dt>
          <dd class="font-mono text-ink">{{ formatTimecode(remainingSeconds(deck)) }}</dd>
        </div>
      </dl>
    </div>

    <div v-show="displayMode === 'settings'" class="min-h-0 flex-1 overflow-auto p-3">
      <section data-testid="keyboard-help" class="mb-4 border border-panel-border p-3">
        <h2 class="mb-2 text-[10px] tracking-[0.2em] text-muted uppercase">Keyboard</h2>
        <p class="text-sm leading-relaxed text-ink">
          1 / 2 focus · Space play/pause · C cue · H channel cue · R rec · Q W E hot cues · I/O/L
          loop · , . half/double · J/K beat jump · Y slip · V vinyl · F color FX · B beat FX · N
          cycle beat FX · T quantize · ← → seek · [ ] pitch bend · M master tempo · S sync · G
          master deck
        </p>
      </section>
      <MidiPanel />
    </div>
  </section>
</template>
