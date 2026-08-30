import type { AnalysisStatus } from './Track'
import { DEFAULT_TEMPO_RANGE, type PitchBend, type TempoRange } from './tempo'

export const HOT_CUE_IDS = ['A', 'B', 'C'] as const
export type HotCueId = (typeof HOT_CUE_IDS)[number]

export interface HotCue {
  id: HotCueId
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
  tempoRange: TempoRange
  pitchBend: PitchBend
  masterTempo: boolean
  syncEnabled: boolean
  masterDeck: boolean
  vinylMode: boolean
  jogVelocity: number
  cuePoint?: number
  hotCues: HotCue[]
  cuePreviewing: boolean
  loopInSeconds?: number
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
    tempoRange: DEFAULT_TEMPO_RANGE,
    pitchBend: 0,
    masterTempo: false,
    syncEnabled: false,
    masterDeck: false,
    vinylMode: false,
    jogVelocity: 0,
    cuePoint: 0,
    hotCues: [],
    cuePreviewing: false,
    slipEnabled: false,
    quantizeEnabled: false,
    analysisStatus: 'idle',
  }
}
