import type { AnalysisStatus } from './Track'

export interface HotCue {
  id: 'A' | 'B' | 'C'
  positionSeconds: number
  label?: string
}

export interface Loop {
  startSeconds: number
  endSeconds: number
  beats?: number
  active: boolean
}

export interface DeckState {
  deckId: 1 | 2
  trackId?: string
  trackTitle?: string
  playing: boolean
  positionSeconds: number
  durationSeconds: number
  originalBpm?: number
  effectiveBpm?: number
  tempoPercent: number
  masterTempo: boolean
  syncEnabled: boolean
  masterDeck: boolean
  vinylMode: boolean
  jogVelocity: number
  cuePoint?: number
  hotCues: HotCue[]
  activeLoop?: Loop
  slipEnabled: boolean
  quantizeEnabled: boolean
  waveformPeaks?: Float32Array
  analysisStatus: AnalysisStatus
}

export function emptyDeckState(deckId: 1 | 2): DeckState {
  return {
    deckId,
    playing: false,
    positionSeconds: 0,
    durationSeconds: 0,
    tempoPercent: 0,
    masterTempo: false,
    syncEnabled: false,
    masterDeck: false,
    vinylMode: false,
    jogVelocity: 0,
    cuePoint: 0,
    hotCues: [],
    slipEnabled: false,
    quantizeEnabled: false,
    analysisStatus: 'idle',
  }
}
