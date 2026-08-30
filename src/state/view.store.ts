import { defineStore } from 'pinia'
import { DEFAULT_ZOOM_WINDOW, zoomIn, zoomOut, type ZoomWindowSeconds } from '../domain/waveformView'

export const DISPLAY_MODES = ['performance', 'browse', 'info', 'settings'] as const

export type DisplayMode = (typeof DISPLAY_MODES)[number]

export const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  performance: 'Perform',
  browse: 'Browse',
  info: 'Info',
  settings: 'Settings',
}

/** Display-only preferences. Never consulted by the audio engine. */
export const useViewStore = defineStore('view', {
  state: (): {
    displayMode: DisplayMode
    zoomWindow: ZoomWindowSeconds
  } => ({
    displayMode: 'performance',
    zoomWindow: DEFAULT_ZOOM_WINDOW,
  }),
  actions: {
    setDisplayMode(mode: DisplayMode) {
      this.displayMode = mode
    },
    zoom(direction: 'in' | 'out') {
      this.zoomWindow = direction === 'in' ? zoomIn(this.zoomWindow) : zoomOut(this.zoomWindow)
    },
  },
})
