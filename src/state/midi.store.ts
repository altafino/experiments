import { defineStore } from 'pinia'
import { emptyMidiState, type MidiState } from '../domain/midi'

export const useMidiStore = defineStore('midi', {
  state: (): { midi: MidiState } => ({
    midi: emptyMidiState(),
  }),
  actions: {
    applySnapshot(snapshot: MidiState) {
      this.midi = snapshot
    },
  },
})
