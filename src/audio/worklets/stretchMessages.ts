export const STRETCH_PROCESSOR_NAME = 'deck-stretch'

export type StretchToWorklet =
  | { type: 'load'; channels: Float32Array[] }
  | {
      type: 'start'
      offsetSamples: number
      playId: number
      loopStartSamples?: number
      loopEndSamples?: number
    }
  | { type: 'setLoop'; startSamples: number; endSamples: number }
  | { type: 'clearLoop' }
  | { type: 'stop' }

export type StretchFromWorklet = { type: 'ended'; playId: number }
