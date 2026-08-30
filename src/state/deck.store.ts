import { defineStore } from 'pinia'
import { emptyDeckState, type DeckState } from '../domain/DeckState'

export const useDeckStore = defineStore('deck', {
  state: (): { deck: DeckState } => ({
    deck: emptyDeckState(1),
  }),
  actions: {
    applySnapshot(snapshot: DeckState) {
      this.deck = snapshot
    },
  },
})
