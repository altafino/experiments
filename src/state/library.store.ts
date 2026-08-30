import { defineStore } from 'pinia'
import { emptyLibraryState, type LibraryState } from '../domain/library'

export const useLibraryStore = defineStore('library', {
  state: (): { library: LibraryState } => ({
    library: emptyLibraryState(),
  }),
  actions: {
    applySnapshot(snapshot: LibraryState) {
      this.library = snapshot
    },
  },
})
