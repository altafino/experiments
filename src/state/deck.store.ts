import { defineStore } from 'pinia'
import type { DeckId } from '../commands/DJCommand'
import { emptyDeckState, type DeckState } from '../domain/DeckState'

export const useDeckStore = defineStore('deck', {
  state: (): {
    deck1: DeckState
    deck2: DeckState
    focusedDeck: DeckId
  } => ({
    deck1: emptyDeckState(1),
    deck2: emptyDeckState(2),
    focusedDeck: 1,
  }),
  actions: {
    applySnapshot(snapshot: DeckState) {
      switch (snapshot.deckId) {
        case 1:
          this.deck1 = snapshot
          return
        case 2:
          this.deck2 = snapshot
          return
        default: {
          const neverDeck: never = snapshot.deckId
          throw new Error(`Unknown deck: ${String(neverDeck)}`)
        }
      }
    },
    focusDeck(deck: DeckId) {
      this.focusedDeck = deck
    },
  },
})
