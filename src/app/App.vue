<script setup lang="ts">
import { storeToRefs } from 'pinia'
import DeckPanel from '../components/controller/DeckPanel.vue'
import MainDisplay from '../components/display/MainDisplay.vue'
import MixerPanel from '../components/mixer/MixerPanel.vue'
import { useDeckStore } from '../state/deck.store'

const deckStore = useDeckStore()
const { focusedDeck } = storeToRefs(deckStore)

function deckStage(deckId: 1 | 2): 'deck-stage-full' | 'deck-stage-strip' {
  return focusedDeck.value === deckId ? 'deck-stage-full' : 'deck-stage-strip'
}
</script>

<template>
  <div class="chassis" data-testid="chassis" role="main">
    <MainDisplay class="chassis-lcd" />
    <DeckPanel :deck-id="1" class="deck-1" :class="deckStage(1)" />
    <MixerPanel class="chassis-mixer" />
    <DeckPanel :deck-id="2" class="deck-2" :class="deckStage(2)" />
  </div>
</template>
