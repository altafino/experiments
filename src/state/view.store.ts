import { defineStore } from 'pinia'
import type { DisplayMode } from '../domain/displayMode'
import { DEFAULT_PAD_BANK, type PadBank } from '../domain/padBank'
import { DEFAULT_ZOOM_WINDOW, zoomIn, zoomOut, type ZoomWindowSeconds } from '../domain/waveformView'

export { DISPLAY_MODES, DISPLAY_MODE_LABELS, type DisplayMode } from '../domain/displayMode'

/** Display-only preferences. Never consulted by the audio engine. */
export const useViewStore = defineStore('view', {
  state: (): {
    displayMode: DisplayMode
    zoomWindow: ZoomWindowSeconds
    padBank: PadBank
  } => ({
    displayMode: 'performance',
    zoomWindow: DEFAULT_ZOOM_WINDOW,
    padBank: DEFAULT_PAD_BANK,
  }),
  actions: {
    setDisplayMode(mode: DisplayMode) {
      this.displayMode = mode
    },
    setPadBank(bank: PadBank) {
      this.padBank = bank
    },
    zoom(direction: 'in' | 'out') {
      this.zoomWindow = direction === 'in' ? zoomIn(this.zoomWindow) : zoomOut(this.zoomWindow)
    },
  },
})
