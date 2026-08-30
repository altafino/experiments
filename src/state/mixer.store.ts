import { defineStore } from 'pinia'
import { emptyMixerState, type MixerState } from '../domain/MixerState'

export const useMixerStore = defineStore('mixer', {
  state: (): { mixer: MixerState } => ({
    mixer: emptyMixerState(),
  }),
  actions: {
    applySnapshot(snapshot: MixerState) {
      this.mixer = snapshot
    },
  },
})
