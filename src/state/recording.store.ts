import { defineStore } from 'pinia'

export const useRecordingStore = defineStore('recording', {
  state: (): { recording: boolean } => ({
    recording: false,
  }),
  actions: {
    apply(recording: boolean) {
      this.recording = recording
    },
  },
})
